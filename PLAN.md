# NAIJA RISE — Lagos · Product Plan

Working title in the PRD: **Lagos Life**. Shipping name in this repo: **NAIJA RISE — Lagos**.
Original IP: original characters, missions, story and systems. The inspiration is open-world action plus Lagos-style life simulation; the district uses real Surulere place and street names on a stylised map.

Pitch: **Build your life. Build your empire. Survive the city.**

---

## 1. Where we are — Alpha 1.0 (October 2026)

The PRD's §25 "Version 0.1" MVP list, checked against the current build:

| PRD MVP item | Status | Notes |
|---|---|---|
| Lagos district network | **Done** | Surulere, Ikoyi, Lekki/Ajah/Eleko, Ikorodu, Apapa, Ikeja, Oyingbo, Yaba/Alagomeji, Ajegunle, Makoko, Agege and Ojo/Badagry; Computer Village, New Afrika Shrine, Kalakuta Republic, Bar Beach, Oniru and Elegushi/Quilox |
| One playable character | **Done** | Customisable skin, hair, shirt, trousers (Character app) |
| Lagos NPC variety | **Done** | Pedestrians, agberos, students, service agencies (Police, Army, LASTMA, LAWMA, VIO, KAI, Civil Defence, FRSC), artisans, night hustlers, owambe crowd and animals; added dense crowd clusters at major markets and busy bus stops |
| 5 vehicles | **Done (11)** | Sedan, danfo, korope, keke napep, okada, BRT, police, fire truck, LAWMA truck, army truck, fuel tanker |
| 10 jobs | **Done (10)** | Plus Market Porter, POS Agent, Bouncer, Tanker Driver; pay scales with Driving / Business / Charisma / Fitness skills |
| Missions | **Done** | 13 story missions across the shared prologue and reputation-gated Amaka/Baba K arcs, plus repeatable, timed district hustle deliveries with cash, XP and reputation rewards |
| Basic economy | **Done** | Cash, bank, transactions, business income, fines, tickets, POS withdrawals |
| Housing | **Done** | Room, self-contain, flat, duplex in fenced compounds; rent via agent (10% fee, 30-day lease) or buy; let owned homes to tenants; hotel rooms at Rita Lori |
| Inventory | **Done** | Consumables and mission items |
| Character customisation | **Done** | |
| Day/night cycle | **Done** | Gradient sky, sun, clouds, street lights, lit windows, NEPA outages |
| Basic multiplayer | **Not started** | See Phase 5 |

Systems that go beyond the MVP list and are already in: heat with police pursuit and arrest, FRSC speeding tickets, army checkpoint, agbero levies (a pet dog keeps them away), rush-hour slowdowns and go-slow traffic, public-transport stop service with passenger turnover and fare-based boarding, Owambe parties, church/mosque, filling station, phone with ten apps, GPS routing along the road grid, Level titles (Newcomer → Hustler → Entrepreneur → Mogul) with app unlocks at Level 2, keyboard/arrow keys, touch and gamepad controls including on-foot jump.

### Codebase

- `src/` — framework-agnostic Three.js engine in ES modules: `core/` (context, events, state, renderer, input, gamepad), `data/` (config, districts, vehicles, characters, jobs, businesses, missions, items), `world/` (textures, builders, districts, interiors, day/night), `entities/` (player, vehicles, NPCs, animals), `systems/` (movement, navigation, dialogue, interaction, economy, vitals, police, events), `ui/` (HUD, minimap, phone and apps, touch, components), `scenes/` (title, city).
- `index.html` + `styles/` — static build; runs from any static server.
- `web/` — Next.js 16 / React 19 / TypeScript shell (Turbopack): landing page with a React Three Fiber hero, `/play` mounts the same engine. Accounts, marketplace and admin will live here.
- Engine and Next shell share `src/` and `styles/`; the engine exposes `createGame({ mount, ui })`.

Decisions taken that differ from the PRD, for review:
- Three.js only. Babylon.js is an alternative renderer, not an addition; the PRD's choice of Three.js / R3F stands.
- Real place and street names (Surulere) instead of a fully fictional city. Characters and story remain fictional. Revisit before public release.
- Mature content (night hustlers, hookups) exists behind a Settings toggle, on by default. This sets an 18+ rating; decide before store submission.

---

### Alpha 0.6 — Life Simulation increment (shipped)
Skills and reputation (PRD §5, §15), ten jobs, a fifth chase mission, businesses with staff and pricing, property upkeep, vehicle ownership with a dealer, service and theft heat, NPC daily rhythm, rain, offline earnings with a "while you were away" report, synthesised audio, save migration from 0.5.

### Alpha 0.7 — Action increment (shipped)
Two story arcs with task-based missions, street racing with wagers and a rival driver, Heat 4–5 responses (army roadblocks, bribes, laying low), vehicle insurance, liveries, slogans and persistent parking, businesses with stock, named staff and a rival, property upgrades and tenant complaints, storms with the flooded Ojuelegba underpass, harmattan haze, PWA manifest and service worker. Deferred: recorded audio and the TypeScript port.

### Alpha 0.8 — Playable Core (shipped)
Consolidation pass on the player (acceleration, deceleration, turning, walk bob, collision, interaction), camera (follow, mouse orbit, zoom, pinch, occlusion, touch), world collision (buildings, fences, props, vehicles), HUD (objective tracker, money, level, stamina, wanted indicator, prompt, location indicator), navigation (minimap, markers, GPS) and performance (merged static geometry, follow-shadows, allocation-free loop, throttled route and minimap, low-end profile for mobile).

### Alpha 0.9 — Living City Phases 1–2 and the first corridor (shipped)
Road classes, expressway and highway medians, traffic lights with LASTMA enforcement, roadside vendors, road incidents; gym, restaurant, mall with cinema, cyber café, street football; an elevation layer with the Shitta flyover, the Costain interchange and National Theatre, Eko Bridge over the Lagos Lagoon, and a first Lagos Island landing (CMS, Broad Street, Cathedral, TBS, Marina). Story missions can be declined and resumed, so the player can choose a life path instead. "The Lagos Experience" polish: redesigned HUD to the commercial-game mockup, verb-and-target interaction prompts, camera feel (lag, FOV, smooth vehicle entry, soft occlusion), animation-ready controller states.

### Alpha 0.10 — Character overhaul (shipped)
One character pipeline for the player and NPCs: rigged GLB (Mixamo-compatible skeleton) loaded once and cloned per character, `AnimationMixer` cross-fading Idle/Walk/Run from the controller states with speed-matched playback, skinned shadows, primitive fallback (offline, low-end, or the asset missing), a Nigerian wardrobe (ankara shirt, senator, buba & sokoto, agbada, Super Eagles, t-shirt & jeans in procedural ankara / adire / aso-oke / lace prints, fila and face cap) with eleven customisation slots that map the fabric onto the rig and build the outfit silhouette on the primitive fallback, Character app and portrait updated, NPCs face their walking direction and animate within range of the camera. The three.js Soldier is the placeholder rig; the asset contract lives in `assets/characters/README.md`.

**Character asset decision (open):** the placeholder proves the pipeline. For Nigerian identity (faces, afro/braids/fade hair, ankara/agbada/buba outfits) the recommended path is a **custom Blender rig** auto-rigged through Mixamo (so the existing bone names and clips keep working), exported as one GLB with Idle/Walk/Run baked; Ready Player Me is the faster stop-gap (Mixamo-compatible, but limited African hair and dress). A gameplay jump is already available from keyboard, mobile touch and gamepad; matching rigged turn/stop/jump and vehicle enter/exit clips remain open.

### Alpha 0.11 — The poster look (shipped)
Post-processing (bloom, split-tone colour grade, vignette, ACES) with an environment map for reflections, wet night roads, the poster's dusk-to-night palette and a golden-hour start; human rigs only (Ready Player Me avatar with RPM locomotion clips, Khronos CesiumMan; a female body needs its own rig and clips) with eleven everyday outfits (ankara to jacket-and-jeans, gowns and skirts) and sneakers for street variety; rigs on mobile; title-screen preload; service-worker cache bump. Graphics quality levels (auto-detect + adaptive step-down, Settings › Graphics) for weaker GPUs; story contacts are characters in the world with objective arrows. Vehicles are Kenney Car Kit models (CC0) with runtime repainting and rolling wheels (keke, okada, BRT and tanker still procedural); houses carry ledges, balconies, ACs, water tanks, dishes, awnings and generators.

### Alpha 1.0 — Corridors (shipped)
The district registry now covers Surulere, Ikoyi/VI, Lekki through Ajah and Eleko, Ikorodu, Apapa, Ikeja, Oyingbo, Yaba/Alagomeji, Ajegunle, Makoko, Agege and Ojo/Badagry; coastal destinations include Bar Beach, Oniru, Elegushi and Quilox. Ikorodu Road and Third Mainland have widened multi-lane profiles, medians with legal U-turn openings and road signs. The Costain/Falomo bridges, Ikorodu Road BRT lanes, pedestrian bridges, terminal danfo queues, toll plaza, road-work diversions, rush-hour bridge profiles and long-distance jobs are wired to district data. Airport terminal/runway/aircraft, procedural wave and shoreline detail, agency and artisan NPCs, and first-pass enterable home/shop/office interiors with doors are implemented. Static world and interior colliders now carry vertical bounds so jumping clears low props and barriers while taller obstacles still block, and collision-overlap recovery lets a player move out of an obstructing spawn/contact. Every local vehicle GLB is categorized and mapped to a traffic vehicle family; keke and korope dimensions/orientation have been tuned, and vehicle materials receive a subtle brightness lift. The phone map now opens from the HUD minimap, supports zoom/pan and place search. Keyboard Escape and controller Options open a pause overlay that freezes city simulation. GLB geometry is Meshopt-compressed at high precision; textures and scene transforms are preserved, and redundant compressed variants are removed.

### Post-Alpha 1.0 — City activity and local missions (shipped)
Computer Village is a market destination; Ikeja also includes the New Afrika Shrine and Kalakuta Republic Museum. Local mission hubs across the Lagos map offer repeatable, timed deliveries themed to their neighbourhoods, including AJ City, Makoko, Surulere, Yaba, Oyingbo, Ikorodu, Apapa, Ikoyi, Lekki–Epe, Agege and Ojo–Badagry. Named searchable neighbourhood destinations now cover Doyin Estate, Orile Iganmu, Abebe Village, Ijora Badiya, Ijora 7up, Festac Satellite Town, Gbagada, Bariga, Shomolu, Magodo, Ogba, Obalende, Mile 12, Mile 2, Coker Aguda, Ijesha and Pako, with new local road links on the west and east mainland. Landmark and home footprints are checked against merged Lagos road extents and moved to nearby dry, road-free sites, keeping their entrances and GPS targets aligned. The live location indicator now updates when crossing regions even if the street name stays the same, and overlapping regions resolve to the most specific neighborhood; the static brand subtitle is city-wide. Medium graphics now include the cinematic look and sharper shadows, with explicit Settings overrides still available. Rain checks are less frequent and rain audio is quieter. Osoanya commission agents at Balogun Market, Yaba Market and Computer Village offer repeatable market delivery runs. Makoko has a canoe landing and dock destination. Markets and busy bus stops have denser pedestrian crowds, and regular traffic slows during morning and evening rush hours. Danfo, korope, keke and BRT traffic serve bus stops, exchange passengers, and allow the player to board for a fare and choose a reachable stop; crew conversations open on player interaction rather than looping automatically. Deep water now slows the player into surface swimming, drains stamina, and causes drowning damage with rescue at the last shore if stamina and health are exhausted. Unowned commercial vehicles require a weapon to hijack, with crew retaliation and reputation consequences; a protection weapon can be purchased in-game. Sidewalks are cut back at road junctions, and the Shitta roundabout sign uses an existing bridge pier rather than a separate post. Browser QA has verified map search for new destinations, GPS set/clear, zoom/reset, and pause/resume. Detailed road, U-turn, bridge, shoreline and airport visual checks remain open.

## 2. Next phase — Alpha 1.1 (Living City Phases 3–4, 4 weeks)

**Corridors — next:** continue tuning street-level detail inside the shipped districts and play-test road widths, U-turns, bridge clearances, shoreline edges, and airport placement in-browser. Map search, GPS set/clear, zoom/reset, and pause/resume have passed an initial browser check. Phone-map labels are now tiered by zoom (neighbourhoods first, then landmarks, bus stops and road names) and collision-checked around labels and controls. Browser QA found and fixed a missing merged-district bridge rush-hour export that caused traffic update errors. Static data checks confirm all six configured U-turn openings are within their road extents and dry, and the airport runway fits within the ground bounds; in-world clearance and visual verification remain open.

**Living City Phase 3 — Life:** expand the shipped family foundation (family compound, requests and relationships) with richer needs and storylines; fitness/recovery progression is implemented: cardio and strength training build separate skills, fitness improves stamina recovery, and strength reduces sprint stamina cost. Yaba Tech Computer Systems diploma enrolment, three paid semesters, graduation tracking, and an IT Support Technician job unlock are implemented. Businesses v4 employee shift scheduling is implemented: staff can cycle among morning, afternoon, overnight, and all-day shifts; the staff income bonus applies only while scheduled staff are on duty. Polytechnic/education expansion beyond the Yaba Tech diploma remains queued.

**Living City Phase 4 — Social:** contact trust and respect now progress through daily capped conversations and contact rewards, with relationship tiers shown in Contacts. Egbon Adugbo is present at the Surulere Adugbo Community Desk and offers skill/certificate-appropriate jobs, with long-haul leads gated by social reputation or a close relationship; friend-tier contacts can receive story leads. Ambient banker and tech-worker NPCs now commute between nearby homes and their workplace anchors, while student NPCs follow school, market, venue, and home routines; broader schedules for other NPC roles and expanded friendship/romance systems remain future work.

**Also queued:** replace or improve the existing non-CC0 keke and okada models, and replace the temporary Volkswagen Crafter BRT and generic heavy-commercial tanker models with purpose-built Lagos vehicles; none of these vehicle types is supplied by the Kenney CC0 kit. Add a building facade kit; production character rig (see the open decision above) with turn/stop/jump and vehicle enter/exit animation clips (on-foot jump controls already work); real outfit meshes per clothing slot instead of tints; NPC uniform meshes (police, LASTMA, agbero caps) on the rig. First-pass artisan workshops, agency uniforms and enterable interiors need a visual/interaction play-test before being treated as fully polished.

**Then (Alpha 1.1+):** Phase 5 dynamic world (NPC schedules, random encounters, neighbourhood stories) and Phase 6 the NAIJA RISE MCP server (world, player, NPC, mission, business, education and community tools) feeding an AI world director; multiplayer groundwork and accounts as planned before.

Goal: make the economy loop deep enough that a player can spend an hour running a legitimate life, and finish the MVP checklist.

1. **Accounts and server save** — Supabase Auth in `web/`, a `players` + `saves` schema (PRD §27), the engine's state blob synced on autosave; local save remains the offline fallback.
2. **Colyseus room per district** — player position, heading, vehicle and look synced at 10 Hz; other players rendered with the same character builder; chat bubble over the HUD.
3. **Crews** — create or join, treasury, HQ at an owned property, crew tag on the player card, shared GPS pins.
4. **Co-op missions** — the race and getaway templates accept a second player; payout split.
5. **TypeScript port** — `src/data/` and `src/systems/` first, with JSDoc-to-TS types shared by the Next shell.
6. **Admin dashboard v0** — a `/admin` route listing players, economy totals and the mission/job/business tables, editable without a rebuild.
7. **Audio v2** — recorded ambience and owambe music behind the existing Sound toggle.
8. **QA gate** — run headless and browser smoke tests across the registry, including loading Yaba and checking interior entry/exit without console errors.

Exit criteria: two players see each other in one Surulere room, saves round-trip through the server, one co-op race, Yaba and other districts load from the registry, interiors return cleanly to the exterior, zero console errors in the headless QA run.

---

## 3. Later phases (from PRD §30)

- **Phase 4 — Action (0.7)**: chase and escape mission templates, street racing on Western Avenue, convoy interception, Heat 4–5 responses (army, roadblocks), safe houses.
- **Phase 5 — Multiplayer (0.8)**: Colyseus rooms per district, player sync, chat, crews with treasury and HQ, co-op missions. Requires the server-side save first.
- **Phase 6 — Alpha release (0.9)**: Supabase Auth accounts in `web/`, PostgreSQL/Neon schema from PRD §27, admin dashboard (PRD §28) for missions/jobs/economy values, analytics, anti-cheat basics, closed testing.
- **Districts**: `src/data/districts/` is a registry with the Lagos areas listed above; continue adding detail and later add other Nigerian states as separate district packs.
- **Platforms**: Web first (done), PWA install (manifest next), then Electron/PC, mobile wrappers.
- **Monetisation (PRD §29)**: cosmetics only — clothing, vehicle liveries, property decor, emotes; "Lagos Life Pass" seasonal cosmetics.

---

## 4. Risks and open questions

- Real place names and brand-like names (BRT, LAWMA, FRSC, Rita Lori, Forties) need a legal pass before public release; fictionalise or license.
- 18+ content vs the "Nigerian/African players first" audience and app-store ratings.
- Headless QA runs on a software renderer at a few frames per second; real-device performance testing (mid-range Android) is still manual.
- The engine is JavaScript; porting `src/` to TypeScript is planned for Phase 6 so the Next shell and engine share types.









# NAIJA RISE — Multi-Platform Technical Roadmap

Project: NAIJA RISE — Lagos · Target: Web, PlayStation, Xbox, Nintendo Switch, and VR

We'll treat this as a platform-readiness and architecture audit, not a rewrite. The existing playable game is the foundation we must protect.

The current project baseline is the Three.js game in [`AzeezBello/NAIJA-RISE`](https://github.com/AzeezBello/NAIJA-RISE), previously tested locally on your Mac and deployed at [web-eight-jet-33.vercel.app](https://web-eight-jet-33.vercel.app/). The known architecture includes the Lagos environment, collision and walkability systems, character models and animation, third-person camera, vehicles, traffic, and gameplay/economy systems.

Our first priority is to establish which parts of that baseline still build and run correctly before making architectural decisions. We should preserve the existing vehicle entry and HUD, headlights, bridge driving, map landmarks, and other working gameplay while testing any new changes.

## 1. Repository audit: current position

I inspected the current repository documentation, package configuration, renderer, input handling, gamepad module, vehicle code, and product plan.

Existing Three.js game

A reusable ES-module engine shared by the static build and the Next.js `/play` experience.

Gamepad input already implemented

The browser Gamepad API feeds movement, camera, vehicle controls, interaction, and pause events into the existing systems.

Performance controls already exist

Graphics quality profiles, reduced rendering costs, and lower-end device settings provide a foundation for optimization.

Latest bridge/traffic fixes need regression verification

The latest commit I found is [`4dd4e71`](https://github.com/AzeezBello/NAIJA-RISE/commit/4dd4e715ff230da72573022afb7614bae5f655b4), “fix: deck regression.” I have not verified a fresh build or live gameplay after that commit.

### What the controller test tells us

Your PlayStation-pad test demonstrates that browser-based controller input is already part of the architecture. It does not yet prove native PlayStation compatibility.

The current gamepad module uses standardized browser button and axis mappings. We should retain that implementation while adding a proper input abstraction so each device can supply its own mappings without changing the gameplay systems.

Reference files:

- [Gamepad handling](https://github.com/AzeezBello/NAIJA-RISE/blob/main/src/core/gamepad.js)
- [Keyboard, mouse and touch input](https://github.com/AzeezBello/NAIJA-RISE/blob/main/src/core/input.js)
- [Three.js renderer](https://github.com/AzeezBello/NAIJA-RISE/blob/main/src/core/renderer.js)
- [Existing product plan](https://github.com/AzeezBello/NAIJA-RISE/blob/main/PLAN.md)

## 2. Engine options: what we should compare

Option A — Keep Three.js

Preserves current game

Strengths: smallest disruption, existing gameplay remains usable, natural fit for browser distribution, and a path to WebXR VR. Three.js documents the required WebXR rendering integration.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://threejs.org\&sz=32)

threejs.org

+1



Limitation: it does not provide the same turnkey native console build pipeline as a dedicated console engine.

Best role: web release, browser-based VR prototype, and continued Alpha development.

Option B — Migrate to Unity

Primary candidate for native multi-platform development

Strengths: Unity officially supports workflows targeting web, XR, PlayStation, Xbox, and Nintendo platforms.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://unity.com\&sz=32)

Unity

+1



Limitation: we would need to port the current game systems, recreate or adapt Three.js rendering and interaction, and validate assets and physics. Console development also requires the relevant platform-holder approvals and access to platform-specific tooling.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://unity.com\&sz=32)

Unity



Best role: a possible native console edition if the audit demonstrates that long-term console support justifies the migration.

Option C — Migrate to Unreal Engine

Alternative for a more extensive 3D production

Strengths: established console development workflows and a powerful 3D rendering environment.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://dev.epicgames.com\&sz=32)

Epic Developer Community



Limitation: the current JavaScript engine would require substantial porting and the rendering/performance approach would change significantly.

Best role: consider if the future game requires a substantially more ambitious graphical production and the team can support the migration.

My preliminary recommendation is not to migrate yet. Keep Three.js as the production baseline while we assess a native-engine vertical slice. Unity is the first candidate to evaluate for the console roadmap, but it should win on demonstrated results rather than assumptions.

A hybrid approach is also possible: retain the web edition and build a separate native console edition that shares approved assets, game data, and documented gameplay rules. That reduces the risk of a big-bang rewrite, although it means maintaining two implementations.

## 3. The implementation roadmap

The roadmap is organized around measurable milestones rather than committing to a particular engine before we have evidence.

## P0

Stabilize and baseline the current build

First priority

- Run the JavaScript syntax checks and Next.js production build.
- Verify the latest bridge, road-deck, traffic, vehicle-entry, and vehicle-exit fixes.
- Test collision with buildings, fences, props and vehicles.
- Confirm saves, missions, HUD, character animation, and keyboard/touch/gamepad input.
- Record current performance and create a known-good release tag.

Exit criteria: a repeatable, playable baseline with documented test results.

## P1

Create a platform-independent input layer

Introduce a common action map for movement, steering, camera, interaction, sprint, braking, pause and menu navigation.

- Preserve the existing browser gamepad implementation.
- Add controller identification and configurable button mappings.
- Separate gameplay actions from physical buttons.
- Define UI navigation and focus behavior for controllers.
- Prepare a mapping specification for PlayStation, Xbox and Switch controllers.

Exit criteria: input changes do not require edits throughout the gameplay systems.

## P2

Build the VR proof of concept

Start with Meta Quest browser-based VR using the existing Three.js engine.

- Enable WebXR rendering and headset tracking.
- Implement a VR camera rig and controller ray interaction.
- Add a comfortable movement mode and seated/standing calibration where appropriate.
- Optimize the Surulere environment for sustained headset performance.
- Test on actual supported hardware, not only desktop emulation.

Three.js provides a documented WebXR integration path.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://threejs.org\&sz=32)

threejs.org



Exit criteria: a short, stable first-person Lagos experience with reliable interaction.

## P3

Run a native-engine feasibility spike

Build one small, representative NAIJA RISE scene in the leading candidate engine. It should include a Lagos street, a player character, a vehicle, a bridge, basic collision and controller input.

Measure:

- Time and effort required to port assets and gameplay.
- Rendering and frame-rate stability on target hardware.
- Vehicle and character control quality.
- Save/data integration requirements.
- Cost of maintaining a native edition alongside the web edition.

Exit criteria: an evidence-based decision to keep Three.js, migrate, or adopt the hybrid model.

## P4

Prepare native console releases

After choosing the architecture and obtaining platform-holder approval:

- Create the first console build.
- Integrate platform-specific controller, save, suspend/resume, user profile and achievement systems as applicable.
- Optimize graphics, memory, loading, UI safe areas and frame pacing.
- Implement platform-specific compliance and certification testing.
- Expand to the remaining consoles using the validated architecture.

Exit criteria: stable platform builds that pass the relevant technical and publishing requirements.

## P5

Unify the NAIJA RISE ecosystem

- Define account and save synchronization across supported platforms.
- Establish shared game-data and content-versioning rules.
- Plan multiplayer architecture if shared-world play remains a goal.
- Evaluate smart-glasses companion features separately from immersive VR.
- Add cross-platform play only after platform policies and technical requirements are confirmed.

Exit criteria: a sustainable multi-platform product architecture rather than several disconnected builds.

## 4. What we need to preserve during development

These are non-negotiable regression checks for each milestone.

| Area       | Required behavior                                                                          |
| ---------- | ------------------------------------------------------------------------------------------ |
| World      | Lagos streets, landmarks, districts, bridge elevations and road connections remain intact  |
| Movement   | Player movement, camera orbit, zoom and collision remain reliable                          |
| Vehicles   | Entry/exit, steering, braking, headlights and driving on elevated bridges continue to work |
| Simulation | Traffic, NPCs, missions, economy, character customization and saves remain functional      |
| Controls   | Keyboard, mouse, touch and existing gamepad behavior are not broken by new input adapters  |
| Delivery   | The current web version remains deployable independently of console experiments            |

I would also introduce automated regression tests around pure gameplay calculations, input mapping and save-data migration. Browser automation can cover the main play loop; hardware testing is still required for actual VR and console validation.

## 5. Immediate next actions

The next development sprint should focus on these deliverables, in order:

1. Baseline report: build results, runtime errors, regression findings and a performance snapshot.
2. Input architecture specification: shared action map, platform mapping rules and controller UI behavior.
3. VR prototype plan: minimum viable WebXR implementation and device test checklist.
4. Engine comparison report: a small Three.js versus Unity feasibility test, with Unreal retained as an alternative if the requirements warrant it.
5. Release gates: explicit conditions for approving a migration or beginning native console work.

One practical constraint: I could inspect the repository, but the connected GitHub integration denied permission to create a branch. I have not modified the production branch or claimed that any new code has been committed. The roadmap above is based on the repository inspection and is ready to be added as a version-controlled project document.

The key decision is to preserve the playable Three.js version while proving the native-console path in a small, isolated prototype. That lets NAIJA RISE continue growing today without locking the project into an expensive engine migration prematurely.