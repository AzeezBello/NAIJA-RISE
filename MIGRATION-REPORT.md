# NAIJA RISE — Three.js vs Unity: verified state

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
| Unity macOS build | succeeded, ~350 MB | The player compiles and links | That it launches and plays well |
| Unity WebGL build | succeeded, 129 MB (`WebGL.data.gz`, `.wasm.gz`, loader) | The WebGL target compiles; first time ever exercised | That it loads in a browser, runs at a usable frame rate, or persists saves |

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
| P2 measured performance on Mac and iPhone, Low/Medium/High | Not started |
| P3 WebGL load test; live Supabase save and two-client multiplayer; crew functions applied and tested | WebGL builds; nothing else |
| P4 each announced platform built and tested on hardware | Not started (macOS builds; Windows module not installed; consoles need platform access) |
| P5 freeze, tag, switch, rollback window, remove | Not started. Do not remove Three.js. |

## Next, in order of value per hour

1. Serve `unity/Builds/WebGL` over HTTP and load it in Chrome and Safari: does it start, run, and save? This decides the
   web question.
2. Profile the same route (spawn to Eko Bridge at 20:00) in both engines on this Mac, then on an iPhone.
3. Create a Supabase project (billed; the organisation is your choice), apply `supabase/schema.sql`, set the URL and
   anon key, and run two clients in one district. Then wire the Unity crew client to the crew functions.
4. Record a manual regression pass of the web build covering the Shitta flyover, Costain, Eko Bridge, Third Mainland,
   the Ojuelegba underpass and driving beneath elevated roads.
