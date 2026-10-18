# RISE — Three.js vs Unity: verified state

Run on 14 October 2026 against the working tree on `feat/unity-slice-urp` (base `85305d3`), macOS 15.8.1 on an Intel
Core i7, Unity 6000.6.5f1, Node 24.15. This file records what was executed and what each result proves. It answers the
external audit of the same day; where that audit asked for evidence, this is the evidence, and where evidence still
does not exist, it says so.

## Executed in this run

| Check | Result | What it proves | What it does not prove |
|---|---|---|---|
| `npm run check` (engine syntax + data) | pass, 171 places, 18 jobs, 15 missions, 0 errors, 3 warnings | Every engine module parses; jobs, missions and contacts resolve to places | Gameplay behaviour |
| `npm run web:build` (Next.js 16) | pass, 6 routes (`/`, `/play`, `/account`, `/admin`, `/icon.svg`, not-found) | The web shell compiles and prerenders | That `/play` runs correctly in a browser |
| `scripts/export-world.mjs` drift | committed `lagos.json` identical to a fresh export | The Unity data is in sync with `src/data` | |
| Unity compile | 0 errors, 0 warnings | | |
| Unity edit-mode smoke test | pass | City builds from data (85 roads, 120 landmarks, ~6,000 objects); every job and contact resolves; coordinate mirror; rigs, fabric print, stadium and tree counts, Kenney sedan scale | Look or feel |
| Unity play-mode test | pass, 107 checks | The scripted loop runs end to end in the editor on the null graphics device (see limits) | Real rendering, input devices, performance |
| Unity macOS build | succeeded, 389 MB, universal (x86_64 + arm64); **launched** on this Mac (Metal, Iris Plus 655) | The player starts, builds the world (6,011 objects) and logs no exceptions | That the window renders correctly: my screenshot captured only the desktop |
| Unity WebGL build | succeeded, 130 MB; **loaded and driven in headless Chrome** (see "WebGL repair") | The player boots in a browser, builds the world, takes keyboard input, opens the phone, with 0 console errors | Frame rate on a real GPU, Safari or Firefox, save persistence |

CI: before this run there was no `.github/workflows`. `.github/workflows/web.yml` now runs the engine check, the
export-drift check and the Next build on every push and pull request. It has not run yet (no push). Unity tests need an
editor licence and still run locally; a self-hosted runner is the way to put them in CI.

## Defects the audit and this run found and fixed

1. **Tautological district-room assertion** (audit finding, confirmed). `ghost.Room != X || ghost.Room == X` cannot
   fail. Replaced with checks that both players start in the same room, that the expected room follows the position, and
   that after moving there is one player in each room and no remotes carried over.
2. **A real bug the stronger assertion exposed.** Messages already queued from a room you left were delivered in the
   room you joined, so a player you had left behind appeared as a phantom. Both realtime transports now drop their
   queue on `Leave`.
3. **Crew access control** (audit finding, confirmed and worse). The old policies let any signed-in user read every
   crew's code and treasury, let anyone insert themselves into any crew without the code, let any member rewrite the
   crew row (including the treasury and the owner), and the self-referencing `crew_members` select policy would raise
   infinite recursion in Postgres. `supabase/schema.sql` now exposes no direct writes: members read their own crews
   through a security-definer helper, and `create_crew`, `join_crew` (requires the code), `leave_crew`, `crew_deposit`,
   `crew_withdraw` (owner only, bounded by the balance) and `set_crew_hq` are the only paths. The admin view is revoked
   from client roles. **This schema has not been applied to any database, so the SQL is unexecuted and unreviewed by
   Postgres.** The Unity crew client currently keeps crews in the save and the loopback channel; wiring it to these
   functions is the live-crew work.


## WebGL repair (14 October, second session)

The WebGL build had never been loaded in a browser. It was loaded in headless Chrome (SwiftShader, WebGL 2.0) through
a small gzip-aware static server, console captured. What it found, in the order found:

1. **`ArgumentNullException: Value cannot be null. Parameter name: shader`**, 7 seconds in, before any scene content.
   Cause: every material was built with `Shader.Find("Universal Render Pipeline/Lit")` at runtime. In a player,
   `Shader.Find` only finds shaders that an asset references; runtime-created materials reference nothing, so the first
   `Awake` threw and the game never built (bare skybox). It works in the editor, which is why 107 checks never saw it.
   Fix: `ShaderLib` loads the shaders from template material assets in `Resources/Materials` (an emissive template
   covers the `_EMISSION` variant), `Editor/ShaderSetup.cs` creates them and lists the shaders under Always Included, and
   the smoke test now checks both.
2. **643 × `Can't add component because class 'SphereCollider' doesn't exist`.** Engine code stripping removed the
   class `GameObject.CreatePrimitive` needs by name. Fix: `Assets/link.xml` preserves the physics module, and a
   `KeepPhysics` type list references the collider classes.
3. **254 × `GL_INVALID_OPERATION: Mismatch between texture format and sampler type`**, then the browser's "too many
   errors". Not a rendering setting: URL-switchable diagnostics (`?diag=noshadows,noprobe,nopost,nohdr,noaddlights,norain`,
   `DiagFlags.cs`) were added to test each, and after fixes 1 and 2 the count is zero in the default configuration and
   in all eight combinations, so these errors were a consequence of the missing components.
4. **Not defects.** The messages that the post-processing passes for Gaussian and Bokeh Depth of Field, Panini
   Projection and FSR upscaling "will not execute" come from URP creating those passes while the build strips their
   shaders, because nothing active uses them. Both URP assets now use a Linear upscaling filter explicitly. The
   `GrayscaleHigh` cookie-format notice, the UnityCache `Content-Length` note (a property of my test server) and the
   `persistentDataPath` sync deprecation are informational.

Audit findings about the configuration, for the record: `QualitySettings` maps the **WebGL platform to quality level 0
(`Mobile`)**, so the web player uses `Mobile_RPAsset` and the forward `Mobile_Renderer` (no renderer features, so no
`Blit FSR Upscaling` feature exists; the message is the built-in upscaling pass). The `PC` asset uses the deferred path
with SSAO and is not suitable for WebGL. The global default volume profile is the URP template's and contains Depth of
Field and Panini Projection components, inactive in practice.

Verified in the browser after the fix: the street, buildings, shadows, rigged player, pedestrians, traffic, minimap,
portrait and HUD draw; holding W moved the player (objective distance 154 → 182 → 225 m); Shift+W and P opened the phone
with its twelve entries; zero console errors in a 150-second run and in eight 60-second runs with feature switches.

**Also found by actually launching things:** the macOS build was Apple Silicon only (`bad CPU type in executable` on this
Intel Mac). `BuildMac` now builds universal. The headless play test found a developer's real `cloud.json` and failed ten
networking checks; it now forces offline (`DiagFlags` `offline`, on while the play test runs). Play test: 107 checks pass.

Still unmeasured: frame rate and memory on a real GPU (SwiftShader is software), Safari and Firefox, iPhone, the 118 MB
compressed data file's load time over a real connection, and whether the macOS window renders as the WebGL one does.


## First real-browser observation (14 October, owner)

The owner ran the Unity WebGL build on their own Mac in Chrome and Safari, with a local server (`serve_webgl.py` in the
gitignored `Builds/WebGL`), and reports that **it plays far better than the Three.js version in both browsers**. This is
the first evidence from a real GPU and from Safari, which the headless run could not give. It is an observation, not a
measurement: no frame times, memory or load times were recorded, and "better" is unquantified. It moves two gates from
"unknown" to "promising": P2 (performance on the target Mac) and P3 (WebGL in the target browsers). It does not close
them. To turn it into evidence, record the same route (spawn to Eko Bridge at 20:00, default quality) in both editions:
frames per second and frame-time spread from the browser's performance panel, tab memory, and time to first playable
frame on a cold cache. Note the Unity data file is 118 MB compressed, so first load on a slow connection will be the
cost side of the comparison.

## Live Supabase project (reported by the owner, 15 October)

Project `naija-rise` (eu-west-1) is active with the migrations applied. Reported by the owner from the Supabase side,
not re-verified from this repo's tooling (my shell cannot reach `*.supabase.co` and the connector does not list the
project): row-level security is on for `players`, `saves`, `crews` and `crew_members`; the six crew functions exist, are
denied to `anon` and granted to `authenticated`. Advisors: the six `SECURITY DEFINER` functions are flagged (accepted by
design, see the note in `supabase/schema.sql`), plus two missing foreign-key indexes and two RLS policies that call
`auth.uid()` per row.

Repo changes for that: `supabase/migrations/20261015_advisor_fixes.sql` (idempotent; run it on the live project) and the
same fixes in `schema.sql`. `supabase/tests/crews_authorization.sql` is a functional test to run in the SQL editor: it
creates three throwaway users, checks that anon is refused, an outsider sees and changes nothing, joining needs the
code, direct writes to the crew tables are refused, members can deposit but not withdraw or set the HQ, the owner can
withdraw only up to the balance, and leaving removes access, then rolls everything back. **It has not been run**; all
three SQL files parse as valid PostgreSQL, which is all that has been checked.

## Limits of the evidence

- **Unit of proof.** The play test calls game methods directly (`Choose`, `StartRace`, `Place`, `FinishTask`) and
  teleports vehicles through race checkpoints. It proves the rules and the wiring, not that a human can drive the route,
  that bridges feel right, or that collisions behave under real physics over distance.
- **Null graphics device.** Headless runs have no GPU, so rendering, the minimap and portrait cameras, the reflection
  probe, particle rain and the quality governor's real frame times are not exercised. The governor test uses simulated
  slow frames.
- **Networking is loopback only.** No Supabase project exists for the game, so sign-up, the cloud save round trip,
  Realtime broadcast, crew tables and the admin page have never run against a server. The cloud-save check tests the
  merge rule, not an upload.
- **Intel, one machine.** No iPhone, Android, Windows, console or VR build or test exists. Performance has not been
  measured against the web edition on any device.
- **Parity is claimed from the data and the test list, not from a side-by-side run.** The web edition has no
  equivalent automated play test, so "the same scenarios in both" has not been done.

## Gates before the Three.js engine can be retired

| Gate | Status |
|---|---|
| P0 reproducible baseline, weak assertions fixed | **Done in this run**; web regression run (recorded gameplay in the browser) still to do |
| P1 gameplay parity, including the bridge, flyover, underpass and collision cases | Not started as a side-by-side; Unity automated coverage exists |
| P2 measured performance on Mac and iPhone, Low/Medium/High | Owner reports Unity WebGL plays far better than Three.js on this Mac in Chrome and Safari (unmeasured); iPhone and quality levels not started |
| P3 WebGL load test; live Supabase save and two-client multiplayer; crew functions applied and tested | WebGL runs in Chrome and Safari on the owner's Mac; live Supabase and crew functions still untested |
| P4 each announced platform built and tested on hardware | Not started (macOS builds; Windows module not installed; consoles need platform access) |
| P5 freeze, tag, switch, rollback window, remove | **Done 17 October by owner decision**, ahead of P1–P4: tagged `threejs-final`, engine and static build removed. Roll back with `git checkout threejs-final`. |

## Next, in order of value per hour

1. Open the WebGL build on a real GPU in Chrome, Safari and Firefox (serve `unity/Builds/WebGL` with gzip
   `Content-Encoding`, for example the script in the scratchpad of this session or any server that sets it) and measure
   frame time, memory and save persistence. It starts and plays under software rendering; that is not a performance result.
2. Profile the same route (spawn to Eko Bridge at 20:00) in both engines on this Mac, then on an iPhone.
3. Create a Supabase project (billed; the organisation is your choice), apply `supabase/schema.sql`, set the URL and
   anon key, and run two clients in one district. Then wire the Unity crew client to the crew functions.
4. Record a manual regression pass of the web build covering the Shitta flyover, Costain, Eko Bridge, Third Mainland,
   the Ojuelegba underpass and driving beneath elevated roads.
