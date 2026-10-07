# NAIJA RISE — Lagos · Product Plan

Working title in the PRD: **Lagos Life**. Shipping name in this repo: **NAIJA RISE — Lagos**.
Original IP: original characters, missions, story and systems. The inspiration is open-world action plus Lagos-style life simulation; the district uses real Surulere place and street names on a stylised map.

Pitch: **Build your life. Build your empire. Survive the city.**

---

## 1. Where we are — Alpha 1.0 (October 2026)

The PRD's §25 "Version 0.1" MVP list, checked against the current build:

| PRD MVP item | Status | Notes |
|---|---|---|
| One district | **Done** | Surulere: Ojuelegba, Kilo, Shitta, Mushin edge, Yaba Market, National Stadium, Ladipo, Marina, bus stops |
| One playable character | **Done** | Customisable skin, hair, shirt, trousers (Character app) |
| 10 NPC types | **Done** | Pedestrians, agberos, police, soldiers, firemen, LAWMA, LASTMA, FRSC, night hustlers, school kids, owambe crowd, animals |
| 5 vehicles | **Done (11)** | Sedan, danfo, korope, keke napep, okada, BRT, police, fire truck, LAWMA truck, army truck, fuel tanker |
| 10 jobs | **Done (10)** | Plus Market Porter, POS Agent, Bouncer, Tanker Driver; pay scales with Driving / Business / Charisma / Fitness skills |
| 5 missions | **Done (13)** | Shared prologue of seven, then two arcs of three (Amaka legit / Baba K risk) gated by reputation; timed, cargo, escape, steal and race objectives |
| Basic economy | **Done** | Cash, bank, transactions, business income, fines, tickets, POS withdrawals |
| Housing | **Done** | Room, self-contain, flat, duplex in fenced compounds; rent via agent (10% fee, 30-day lease) or buy; let owned homes to tenants; hotel rooms at Rita Lori |
| Inventory | **Done** | Consumables and mission items |
| Character customisation | **Done** | |
| Day/night cycle | **Done** | Gradient sky, sun, clouds, street lights, lit windows, NEPA outages |
| Basic multiplayer | **Not started** | See Phase 5 |

Systems that go beyond the MVP list and are already in: heat with police pursuit and arrest, FRSC speeding tickets, army checkpoint, agbero levies (a pet dog keeps them away), go-slow traffic jams, Owambe parties, church/mosque, filling station, phone with ten apps, GPS routing along the road grid, Level titles (Newcomer → Hustler → Entrepreneur → Mogul) with app unlocks at Level 2, keyboard/arrow keys, touch controls, gamepad.

### Codebase

- `src/` — framework-agnostic Three.js engine in ES modules: `core/` (context, events, state, renderer, input, gamepad), `data/` (config, districts, vehicles, characters, jobs, businesses, missions, items), `world/` (textures, builders, district, day/night), `entities/` (player, vehicles, NPCs, animals), `systems/` (movement, navigation, dialogue, interaction, economy, vitals, police, events), `ui/` (HUD, minimap, phone and apps, touch, components), `scenes/` (title, city).
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

**Character asset decision (open):** the placeholder proves the pipeline. For Nigerian identity (faces, afro/braids/fade hair, ankara/agbada/buba outfits) the recommended path is a **custom Blender rig** auto-rigged through Mixamo (so the existing bone names and clips keep working), exported as one GLB with Idle/Walk/Run baked; Ready Player Me is the faster stop-gap (Mixamo-compatible, but limited African hair and dress). Turn/stop clips, a jump and vehicle enter/exit come with the same asset.

### Alpha 0.11 — The poster look (shipped)
Post-processing (bloom, split-tone colour grade, vignette, ACES) with an environment map for reflections, wet night roads, the poster's dusk-to-night palette and a golden-hour start; human rigs only (Ready Player Me avatar with RPM locomotion clips, Khronos CesiumMan; a female body needs its own rig and clips) with eleven everyday outfits (ankara to jacket-and-jeans, gowns and skirts) and sneakers for street variety; rigs on mobile; title-screen preload; service-worker cache bump. Graphics quality levels (auto-detect + adaptive step-down, Settings › Graphics) for weaker GPUs; story contacts are characters in the world with objective arrows. Vehicles are Kenney Car Kit models (CC0) with runtime repainting and rolling wheels (keke, okada, BRT and tanker still procedural); houses carry ledges, balconies, ACs, water tanks, dishes, awnings and generators.

### Alpha 1.0 — Corridors (shipped)
Falomo Bridge → Victoria Island → Lekki toll gate and Lekki Phase 1; Third Mainland Bridge → Yaba; Ikorodu Road across Ebute Metta to Ikorodu Garage via Western Avenue; pedestrian bridges, terminal danfo queues, toll plaza with fees and heat, road-works diversions, bridge rush profiles, long-distance jobs; world builders generated from the district data (roads, medians, lights, signs, water bodies, cells).

## 2. Next phase — Alpha 1.1 (Living City Phases 3–4, 4 weeks)

**Corridors — remaining:** Ikoyi proper between the Island and VI, Lekki beyond Phase 1 (Ajah, Eleko), Ikorodu town, Apapa port road; interchange ramps at Costain and Falomo; BRT dedicated lanes on Ikorodu Road.

**Living City Phase 3 — Life:** family system (mum, sibling, uncle with needs, requests and storylines), education tree (training centre, computer institute, polytechnic) that unlocks careers, fitness as recovery/strength, businesses v4 (employees with schedules).

**Living City Phase 4 — Social:** NPC relationship model (trust, respect, affection, reputation), friendships and romance, Egbon Adugbo as the neighbourhood network manager who hands out jobs and missions by local reputation.

**Also queued:** keke, okada, BRT and tanker models (none in the CC0 kits yet) and a building facade kit; production character rig (see the open decision above) with turn/stop, jump and vehicle enter/exit clips; real outfit meshes per clothing slot (the fabric prints already exist as textures) instead of tints; NPC uniform meshes (police, LASTMA, agbero caps) on the rig.

**Then (Alpha 1.1+):** Phase 5 dynamic world (NPC schedules, random encounters, neighbourhood stories) and Phase 6 the NAIJA RISE MCP server (world, player, NPC, mission, business, education and community tools) feeding an AI world director; multiplayer groundwork and accounts as planned before.

Goal: make the economy loop deep enough that a player can spend an hour running a legitimate life, and finish the MVP checklist.

1. **Accounts and server save** — Supabase Auth in `web/`, a `players` + `saves` schema (PRD §27), the engine's state blob synced on autosave; local save remains the offline fallback.
2. **Colyseus room per district** — player position, heading, vehicle and look synced at 10 Hz; other players rendered with the same character builder; chat bubble over the HUD.
3. **Crews** — create or join, treasury, HQ at an owned property, crew tag on the player card, shared GPS pins.
4. **Co-op missions** — the race and getaway templates accept a second player; payout split.
5. **TypeScript port** — `src/data/` and `src/systems/` first, with JSDoc-to-TS types shared by the Next shell.
6. **Admin dashboard v0** — a `/admin` route listing players, economy totals and the mission/job/business tables, editable without a rebuild.
7. **Audio v2** — recorded ambience and owambe music behind the existing Sound toggle.
8. **Second district stub** — Yaba (tech) as a `districts/yaba.js` with a road grid, three landmarks and a BRT link to Surulere, to prove the registry.

Exit criteria: two players see each other in one Surulere room, saves round-trip through the server, one co-op race, Yaba loads from the registry, zero console errors in the headless QA run.

---

## 3. Later phases (from PRD §30)

- **Phase 4 — Action (0.7)**: chase and escape mission templates, street racing on Western Avenue, convoy interception, Heat 4–5 responses (army, roadblocks), safe houses.
- **Phase 5 — Multiplayer (0.8)**: Colyseus rooms per district, player sync, chat, crews with treasury and HQ, co-op missions. Requires the server-side save first.
- **Phase 6 — Alpha release (0.9)**: Supabase Auth accounts in `web/`, PostgreSQL/Neon schema from PRD §27, admin dashboard (PRD §28) for missions/jobs/economy values, analytics, anti-cheat basics, closed testing.
- **Districts**: `src/data/districts/` is a registry; next areas are Yaba (tech), Ikeja (CBD), Lekki/VI (luxury), Apapa (port), then other Nigerian states as separate district packs.
- **Platforms**: Web first (done), PWA install (manifest next), then Electron/PC, mobile wrappers.
- **Monetisation (PRD §29)**: cosmetics only — clothing, vehicle liveries, property decor, emotes; "Lagos Life Pass" seasonal cosmetics.

---

## 4. Risks and open questions

- Real place names and brand-like names (BRT, LAWMA, FRSC, Rita Lori, Forties) need a legal pass before public release; fictionalise or license.
- 18+ content vs the "Nigerian/African players first" audience and app-store ratings.
- Headless QA runs on a software renderer at a few frames per second; real-device performance testing (mid-range Android) is still manual.
- The engine is JavaScript; porting `src/` to TypeScript is planned for Phase 6 so the Next shell and engine share types.
