# Rise: Hustle or Die Trying · Product Plan

Working title in the PRD: **Lagos Life**. Shipping name in this repo: **Rise: Hustle or Die Trying**.
Original IP: original characters, missions, story and systems. The inspiration is open-world action plus Lagos-style life simulation; districts use real Lagos place and street names on a stylised map.

Pitch: **Build your life. Build your empire. Survive the city.**

---

## 1. Where we are — Alpha 1.0 (October 2026)

The PRD's §25 "Version 0.1" MVP list, checked against the current Unity build:

| PRD MVP item | Status | Notes |
|---|---|---|
| Lagos & Multi-State network | **Done (16 Lagos + 6 State modules)** | All 5 Lagos Megacorridors (Surulere, Ikoyi/Banana Island, VI/Lekki/Ajah/Ibeju-Lekki/Epe, Ikorodu/Imota, Apapa, Ikeja, Oyingbo, Yaba, Ajegunle, Makoko, Agege, Alimosho/Oshodi/Mushin/Ifako-Ijaiye, Kosofe/Mile 12/Magodo, Festac/Trade Fair/Ojo/Badagry/Seme Border) plus 6 Multi-State Geopolitical Zone maps (`ogun`, `oyo`, `fct`, `rivers`, `anambra`, `kano`) totaling **323 places, 119 roads, 85 regions, and 102 compound cells** |
| One playable character | **Done** | Customisable skin, hair, outfit, fabric print, body type, facial hair, accessories (Character app) |
| Lagos & Nigerian NPC variety | **Done (106 contacts)** | Pedestrians with daily schedules, agberos, students, service agencies (Police, Army, Navy, LASTMA, LAWMA, VIO, KAI, Civil Defence, FRSC, EFCC), artisans, night hustlers, owambe crowd and animals; **106 named contacts** including 32 Surulere street contacts, 6 Politicians, Fraudsters, 5 Lagos Megacorridor Hubs, and 5 Multi-State Geopolitical Hubs |
| 5 vehicles | **Done (18)** | Sedan, SUV, hatchback, taxi, danfo, korope, keke napep, okada, BRT, police, fire truck, ambulance, van, delivery truck, LAWMA truck, army truck, fuel tanker, speedboat/canoe |
| 10 jobs | **Done (34)** | 34 jobs across driving, tech, maritime, security, artisan, Lagos megacorridor (`oshodi_dispatch`, `aspamda_clearing`, `mile12_produce`, `refinery_haulage`, `seme_customs`), and interstate (`ota_ibadan_haulage`, `federal_tender_convoy`, `bonny_lng_offshore`, `onitsha_nnewi_trade`, `dawanau_trans_saharan`) tracks |
| Missions & Story Chains | **Done** | Prologue, Hot Delivery, Crossroads, reputation-gated Amaka/Baba K arcs, **15 three-chapter Neighbourhood & Multi-State Story Chains**, 4 3D Indoor Missions, plus **108 repeatable timed runs** |
| Basic economy | **Done** | Cash, RiseBank, business income, employee shift scheduling, offline "Lagos Never Sleeps" earnings, fines, tickets, POS withdrawals |
| Housing | **Done** | Room, self-contain, flat, duplex in fenced compounds; rent via Agent Kunle (10% fee, 30-day lease) or buy; let owned homes to tenants; home upgrades and tenant complaint repairs; hotel rooms at Rita Lori; enterable 3D interiors |
| Inventory | **Done** | Consumables, protection weapon, laptop, and mission items |
| Character customisation | **Done** | 11 customisation slots with procedural Nigerian fabric prints and live HUD portrait |
| Day/night cycle | **Done** | Sun, moonlit night, street lights, NEPA outages, rain, storms, and harmattan haze |
| Basic multiplayer | **Done** | Rooms per district, player sync, crews, shared GPS pins, co-op racing, and chat over Supabase Realtime (`unity/Assets/Rise/Scripts/Net/`) with offline loopback fallback |

### Project Folder Structure

```text
rise-lagos/
├── .github/workflows/
│   └── web.yml                            # CI: data syntax/ref check, lagos.json export drift check, Next.js build
├── PLAN.md                                # Product plan, completed milestones & multi-state expansion roadmap
├── MIGRATION-REPORT.md                    # Reproducible verification report, test commands & platform status
├── README.md                              # Root quick-start, controls & overview
├── webgl_server.py                        # Local Gzip-aware HTTP server for Unity WebGL builds
├── scripts/
│   ├── check-data.mjs                     # Validates all districts, states, places, jobs & contact runs
│   ├── export-world.mjs                   # Exports src/data/ → unity/Assets/Rise/Resources/world/lagos.json
│   ├── package-webgl.mjs                  # Packages unity/Builds/WebGL into WebGL.zip for itch.io / CDN
│   ├── render-build.mjs                   # Production Render build hook for Next.js companion site
│   ├── verify-supabase.mjs                # Verifies live Supabase Auth, RLS, Storage & economy config
│   └── check-supabase.sh                  # Shell wrapper for Supabase live checks
├── src/data/
│   ├── config.js                          # Game constants, economy, law, rent, businesses & place pricing
│   ├── characters.js                      # 106 named contacts (family, hubs, street contacts, politicians, interstate hubs)
│   ├── jobs.js                            # 34 jobs across driving, tech, maritime, security, megacorridor & interstate tracks
│   ├── vehicles.js                        # 18 vehicle classes, liveries & danfo slogans
│   ├── businesses.js                      # 4 ownable businesses, staff shifts & rival rules
│   ├── family.js                          # Family compound members, schedules, requests & relationship tiers
│   ├── items.js                           # Consumables, tools, weapons & mission cargo items
│   ├── crew.js                            # Crew ranks, tags & co-op constants
│   ├── schedules.js                       # Pedestrian daily routine schedules
│   ├── locations.js                       # Re-exports active district map
│   ├── nigeria-states.js                  # All 36 Nigerian States + FCT Abuja metadata & interstate corridors
│   ├── districts/                         # Lagos megacity district modules (merged by lagos.js)
│   │   ├── area.js                        # Shared createArea() factory for districts & states
│   │   ├── index.js                       # District registry (DISTRICTS, ACTIVE_DISTRICT)
│   │   ├── lagos.js                       # Master Lagos merger + road-footprint collision solver
│   │   ├── surulere.js                    # Surulere core grid + OSM street contacts
│   │   ├── ikoyi.js                       # Ikoyi, Lagos Island, Marina, Obalende & Banana Island
│   │   ├── lekki.js                       # Victoria Island, Oniru, Elegushi, Lekki, Ajah, Ibeju-Lekki & Epe
│   │   ├── yaba.js                        # Yaba, Alagomeji, Akoka, UNILAG & YabaTech
│   │   ├── ikeja.js                       # Ikeja CBD, Computer Village, Alausa, Shrink/Kalakuta & MMA Airport
│   │   ├── ikorodu.js                     # Ikorodu Road, Mile 12 link & Ikorodu Town
│   │   ├── apapa.js                       # Apapa Wharf, Tin Can Island & Creek Road
│   │   ├── ajegunle.js                    # Ajegunle (AJ City) & Boundary Market
│   │   ├── makoko.js                      # Makoko lagoon stilt settlement & canoe docks
│   │   ├── oyingbo.js                     # Oyingbo Market & Ebute Metta rail corridor
│   │   ├── agege.js                       # Agege Motor Road, Pen Cinema & Iju
│   │   ├── ojo-badagry.js                 # Mile 2, Festac, Ojo, Alaba Int'l Market, LASU & Badagry
│   │   ├── west-mainland.js               # Orile Iganmu, Ijora Badiya, Coker Aguda & Ijesha
│   │   ├── east-mainland.js               # Gbagada, Bariga & Shomolu
│   │   ├── alimosho-oshodi.js             # Alimosho (Egbeda/Ikotun), Oshodi Interchange, Isolo & Mushin/Ladipo
│   │   └── kosofe-magodo.js               # Kosofe, Ojota Interstate Park, Ketu, Mile 12 & Magodo GRA
│   └── states/                            # Multi-state expansion modules across Nigeria's 6 geopolitical zones
│       ├── index.js                       # State map registry (STATE_MAPS, ACTIVE_STATE_MAPS)
│       ├── ogun.js                        # Ogun State (Mowe/Ibafo, Sagamu Interchange, Ota/Agbara, Abeokuta)
│       ├── oyo.js                         # Oyo State (Ibadan: Challenge, Dugbe/Cocoa House, Bodija, UI, Iwo Road)
│       ├── fct.js                         # FCT Abuja (Three Arms Zone, Aso Villa, NASS, CBN/EFCC HQ, Wuse/Maitama)
│       ├── rivers.js                      # Rivers State (Port Harcourt GRA, Trans-Amadi, Onne & Bonny LNG)
│       ├── anambra.js                     # Anambra State (Onitsha Main Market, 2nd Niger Bridge, Nnewi, Awka)
│       └── kano.js                        # Kano & Northern Frontier (Kurmi Market, Sabon Gari, Dawanau, JTF FOB)
├── supabase/
│   ├── schema.sql                         # PostgreSQL schema, RLS policies, Crew RPCs, save validation & economy_config
│   ├── migrations/                        # Timestamped SQL migrations (advisor fixes, economy_config)
│   └── tests/crews_authorization.sql      # SQL authorization & RLS verification suite
├── web/                                   # Next.js 16 / React 19 / TypeScript companion web app
│   ├── app/
│   │   ├── page.tsx                       # Landing page
│   │   ├── play/page.tsx                  # Unity WebGL embed shell (/play)
│   │   ├── account/page.tsx               # Player account & cloud save portal (/account)
│   │   ├── admin/page.tsx                 # Live economy & player telemetry dashboard (/admin)
│   │   ├── admin/EconomyEditor.tsx        # Authenticated live economy editor component
│   │   └── api/economy/route.ts           # Admin-authenticated API route for live economy updates
│   └── lib/
│       ├── supabase.ts                    # Browser (anon) and server (service_role) Supabase clients
│       └── economy.ts                     # Economy config merger, loader & dual table/storage persistence
└── unity/                                 # Unity 6000.6.5f1 project (URP 17.6, Input System 1.19, glTFast 6.0.1)
    ├── README.md                          # Unity architecture, controls & CLI build/test commands
    └── Assets/Rise/
        ├── Scenes/Lagos.unity             # Main game scene (auto-bootstrapped via GameBootstrap)
        ├── Editor/                        # Build & verification pipeline (SceneSetup, PlayTest, ShaderSetup, CharacterImport)
        ├── Resources/
        │   ├── world/lagos.json           # Exported world, districts, contacts, jobs, vehicles & states
        │   ├── Input/Rise.inputactions    # Multi-platform Input System actions (Keyboard, Gamepad, PS, Xbox, Switch, Touch)
        │   ├── Materials/                 # URP shader preservation templates (NR_Lit, NR_Unlit, NR_LitEmissive)
        │   ├── Models/                    # GLB 3D assets (Characters, Vehicles, Landmarks, Animals, Vegetation)
        │   └── Characters/                # Legacy retargeted animation clips (RPM, CesiumMan, Dog)
        └── Scripts/
            ├── GameBootstrap.cs           # Scene bootstrapper with AfterSceneLoad auto-guard & save sanitization
            ├── GameInput.cs               # Unified cross-platform input & 1–9 / scroll-wheel menu routing
            ├── GameState.cs               # Persistent player state, inventory, bank, property & away earnings
            ├── Session*.cs                # Partial Session classes (Story, Places, Phone, Crew, Shootout, Vehicles, etc.)
            ├── Data/WorldData.cs          # JSON loader & Unity coordinate mirror (WorldData.W)
            ├── Entities/                  # CharacterRig (7 clips incl. jump/turn/vehicle) & procedural Nigerian Fabrics
            ├── Player/                    # PlayerController & ThirdPersonCamera (with IndoorMode framing)
            ├── Vehicles/                  # VehicleController (arcade physics) & VehicleBodies (GLB fitter)
            ├── Story/Story.cs             # Prologue, Amaka/Baba K arcs & dynamic reward table
            ├── UI/                        # Hud, Minimap, Portrait, TouchControls & procedural SoundSystem
            ├── Net/                       # Account, CloudSave, CloudEconomy (live polling), Multiplayer & Realtime
            └── World/                     # WorldBuilder, StreetLife, ContactSystem, Law, Events, Weather, Navigation, QualityGovernor
```

---

## 2. Completed Milestones

### Milestone 1 — City & Corridors
`npm run export:unity` exports the merged district map (`src/data/districts/lagos.js`) to JSON. `WorldBuilder.cs` generates Surulere, Ikoyi/VI, Lekki/Ajah/Eleko, Ikorodu, Apapa, Ikeja, Oyingbo, Yaba/Alagomeji, Ajegunle, Makoko, Agege and Ojo/Badagry: roads, pavements, medians, street lights, four bridge decks (Eko Bridge, Carter Bridge, Third Mainland Bridge, Falomo Bridge, Shitta flyover) on their real elevation profiles, water bodies, landmarks with signs, Murtala Muhammed Airport (terminal, control tower, runway, aircraft), Makoko stilt huts and canoes, football pitches with goalposts and floodlights, bus stops, properties, compound cells, and region-aware housing with rooftop water tanks, AC units, balconies, and generators.

### Milestone 2 — Life, Economy & Places
Jobs and shifts, POS kiosks (pure water, suya, ₦20,000 cash withdrawal), roadside vendors, Agent Kunle property rentals and purchases, tenant rent and complaint repairs, home upgrades (generator, water tank, security), four businesses with stock, pricing, rival trader, and employee shift scheduling (`morning`, `afternoon`, `night`, `all-day`), "Lagos Never Sleeps" offline earnings, danfo transit with conductor fare negotiation, Lekki toll plaza, Surulere Fitness Gym, restaurants, Adeniran Ogunsanya Mall (outfits, supermarket groceries, laptop, barber, cinema), Cyber Café certificate courses, Community Grammar School, Yaba Tech diploma, nightlife clubs and bars, Saturday Owambe spraying, church/mosque prayer, Rita Lori Hotel, PHCN generator diesel payments, and enterable 3D interiors for homes, shops, and offices.

### Milestone 3 — People, Wardrobe & Surulere Contacts
Ready Player Me and Khronos CesiumMan rigs with 11 customisation slots and procedural Nigerian fabric prints (`Fabrics.cs`). 64 placed contacts including Mama Tunde and Chioma at the family compound (daily routines and household requests), 17 district hustle hubs, and 32 Surulere street contacts standing on their real streets (projected from OpenStreetMap coordinates in Ikate/Kilo/Surulere) offering 36 repeatable timed runs. Pedestrians follow role-based daily pace schedules (`trader`, `office`, `youth`, `wander`).

### Milestone 4 — Vehicles, Law & Street Life
17 vehicle classes built from GLB models with spinning wheels, persistent owned vehicles, Dayo's dealership (service, insurance, liveries, danfo slogans, protection weapon), commercial vehicle hijack protection-weapon check and crew retaliation, deep-water swimming and drowning rescue, traffic lights with LASTMA enforcement, FRSC speeding checks, army checkpoints, Heat 3–5 police pursuit and roadblocks, agbero levies at bus stops (deterred by the pet dog or home security), uniformed service NPCs, night hustlers, and dynamic road events (go-slows, road construction diversions, overturned keke, Ojuelegba underpass storm flood, NEPA outages).

### Milestone 5 — Smartphone, Audio, Accounts & Multiplayer
Smartphone with 12 apps including `Map · GPS` (searchable across all landmarks, bus stops, properties, and contacts with live Dijkstra GPS routing). Procedural synthesised audio (`SoundSystem.cs`) for engine hum, rain, NEPA generator drone, crash horn, and cash chime. Quality governor (`QualityGovernor.cs`) with GPU auto-detect, automatic level step-down, and four-step dynamic resolution. Supabase Auth accounts, cloud save sync, district Realtime multiplayer rooms, crews (shared treasury, HQ, GPS pins), and co-op street racing.

### Milestone 6 — Live Supabase, Co-op Getaway & Convoy, Neighbourhood Story Chains & Admin Economy Editor
Live production Supabase deployment (`supabase/schema.sql`, `unity/Assets/Rise/Resources/cloud.json`, `web/.env`, `scripts/verify-supabase.mjs`) with Email Auth, Realtime, Crew RPCs, and live `game-config/economy.json` + `economy_config` syncing (`CloudEconomy.cs`). Extended crew co-op with multi-player **Co-op Getaway** (Heat-4 coordinated escape) and **Co-op Convoy** (3-checkpoint armoured logistics run from Iponri → Costain → Apapa Wharf), interactive **Dynamic Street Encounters** (`Events.cs` — broken-down danfo, roadside dispute, stranded executive), 5 multi-chapter **Neighbourhood Story Chains** (Surulere, Yaba, Ikoyi/Lekki, Makoko, Ikeja), and live **Admin Dashboard Editing** at `/admin` (`web/app/admin/`) to update job payouts, mission rewards, and economy constants without a client rebuild.

### Milestone 7 — Native Console & Mobile Builds
Expanded Input System action maps (`unity/Assets/Rise/Resources/Input/Rise.inputactions` & `GameInput.cs`) across `Gameplay`, `Driving`, and `UI` action maps with 6 device control schemes (`Keyboard`, `Gamepad`, `PlayStation`, `Xbox`, `Switch`, `Touch`), full D-pad menu navigation, vehicle horn (`H` / L3), and controller family detection. Configured 10 platform build targets in `SceneSetup.cs`: macOS Universal (`x64ARM64`), Windows 64-bit, WebGL (Gzip + decompression fallback), iOS, Android (`ARM64`), PlayStation 5, PlayStation 4, Xbox Series X|S, Xbox One, and Nintendo Switch.

### Milestone 8 — Historic Timeline (1999–2026+), Politicians, Counter-Insurgency Ops, Furnished Interiors, Nightlife, Ambience & Full UI/UX/Graphics Audit
- **Full Calendar & Historic Timeline (Jan 1, 1999 – 2026+)**: Day-of-week, month, and year calendar starting `Fri, Jan 1, 1999` (`DayNightCycle.cs`) with 18 historic eras (`Events.cs` — 1999 Transition & General Election, 2001 GSM Revolution, 2004 CBN Consolidation, 2013 AFCON Victory, 2014 Ebola Contained, 2015/2019/2023 General Elections, 2020 COVID-19 Pandemic & NCDC Lockdown, 2024 Lagos Blue/Red Line Rail) and the **Lagos Chronicle** news app (`Session.Phone.cs`).
- **Governance Tiers, Fraudsters, Boko Haram & Armed Bandits**: 96 named contacts (`ContactSystem.cs`) including 6 multi-tier Politician NPCs (Presidential Envoy, Lagos State Governor, Lagos Central & West Senators, Surulere Federal Representative, Surulere LGA Chairman), Fraudster syndicate NPCs with EFCC Whistleblower Sting bounties, and Nigerian Army JTF / 81 Division Spec-Ops against Boko Haram cells (`OP LAFIYA DOLE`) and Armed Bandit kingpins (`OP HADARIN DAJI`).
- **Furnished 3D Interiors, Indoor Missions & Lagos Nightlife**: Interactive 3D indoor stations (`Session.Places.cs` — Kitchen Jollof Cooker, Home Workout, Boxing Sparring Ring, Cyber Café Server Rack, Forensic Audit Desk, Snooker & Ludo Table, and 3D Neon Nightclub with Afrobeats Dancefloor, DJ Booth & VIP Dorime Bottle Service) plus 4 multi-stage 3D Indoor Missions.
- **Lagos Street Ambience, Owambe Music & Extended Character Animations**: Procedural Lagos street ambience and Owambe/Afrobeats Jùjú music loops gated behind the Sound toggle (`SoundSystem.cs`), and expanded character animation clips (`jump`, `turn`, `enter_vehicle`, `exit_vehicle`) on `CharacterRig.cs` and `PlayerController.cs`.
- **Full UI, UX, Graphics & Responsiveness Audit**: Auto-scrolling viewport-clamped menus (`Hud.cs`) with scrollbar indicators, `TextClipping.Clip` card styles, aspect-ratio-aware multi-resolution HUD scaling (720p, 1080p, 4:3, 21:9, 4K), 1–9 digit shortcuts & mouse-wheel scrolling (`GameInput.cs`), indoor camera framing (`ThirdPersonCamera.cs`), and automated `AuditUiAndUxHealth` + `AuditGraphicsAndResponsiveness` verification (`QualityGovernor.cs`).

### Milestone 9 — All 5 Lagos Megacorridors, 6-Zone Multi-State Rollout, Interstate Transit & Live Cloud Hardening
- **5 Lagos Megacorridors & 6 Multi-State Geopolitical Maps (`src/data/districts/` & `src/data/states/`)**: Built and merged `alimosho-oshodi.js`, `kosofe-magodo.js`, expanded `ojo-badagry.js`, `lekki.js`, and `ikorodu.js` alongside `ogun.js`, `oyo.js`, `fct.js`, `rivers.js`, `anambra.js`, and `kano.js` into `lagos.json` (**323 places, 34 jobs, 106 contacts, 108 contact runs, 119 roads, 102 compound cells, 85 regions, 37 states, 0 errors**).
- **15 Three-Chapter Story Chains & Regional Housing (`Session.Hustle.cs` & `WorldBuilder.cs`)**: Added 5 Lagos Megacorridor Story Chains (`alimosho_chain`, `amuwo_chain`, `kosofe_chain`, `ibeju_chain`, `badagry_chain`) and 5 Multi-State Geopolitical Story Chains (`southwest_chain`, `abuja_chain`, `niger_delta_chain`, `eastern_chain`, `northern_chain`), plus `festac`, `magodo`, `ladipo`, and `epe` 3D compound archetypes.
- **Multimodal Interstate Transit & Landmark Menus (`Session.Places.cs`)**: Wired interactive menus for `hospital` (`OpenHospitalMenu`), `airport` (`OpenAirportMenu` — commercial flights across 6 Nigerian airports + Executive Private Jet Charter), `museum` (`OpenMuseumMenu`), `market` (`OpenMarketMenu` — Ladipo overhaul + wholesale lot flipping), `warehouse` (`OpenDepotMenu`), `garage` (`OpenInterchangeMenu` — Lagos BRT + Interstate Luxury Coaches), `rail` (`OpenRailMenu` — Lagos Blue/Red Line Metro + NRC Standard-Gauge Express across Ebute Metta, Abeokuta, Ibadan, Abuja & Kano), and `checkpoint` (`OpenCheckpointMenu` — FRSC, Customs, NDLEA & JTF border gates).
- **Online Security & Runtime Resilience (`CloudEconomy.cs`, `GameBootstrap.cs`, `/api/economy`, `supabase/schema.sql`)**: Added administrator authentication on `POST /api/economy`, 45-second live economy polling (`CloudEconomy.LivePollLoop`), PostgreSQL `validate_save_state()` trigger and `claim_verified_reward()` RPC, and `GameBootstrap.EnsureBootstrapped()` auto-guard against blank WebGL/standalone scenes.

---

## 3. Expansion Roadmap — Full Lagos Megacity (All 20 LGAs / 37 LCDAs)

The world now covers **16 Lagos district modules** (`src/data/districts/*.js`) across all **20 Local Government Areas (LGAs)** and **37 Local Council Development Areas (LCDAs)**:

### 3.1 Lagos Megacorridors & Districts (All 5 Corridors Built in `src/data/districts/` & `lagos.json`)

| Corridor / Division | Status | LGAs & Key Neighbourhoods | Signature Landmarks, Markets & Gameplay Loops |
|---|---|---|---|
| **West Mainland & Alimosho Megacorridor** | **Done** (`alimosho-oshodi.js`) | **Alimosho** (Egbeda, Ikotun, Igando, Idimu, Ipaja, Ayobo), **Oshodi-Isolo** (Oshodi Interchange, Isolo, Mafoluku, Ago Palace Way, Ejigbo), **Mushin** (Idi-Oro, Ladipo Market, Palm Avenue, Daleko), **Ifako-Ijaiye** (Ogba, Fagba, Iju-Ishaga, Alagbado) | **Oshodi 3-Terminal Transport Interchange** (`oshodi-interchange`), **Ladipo Auto Spare Parts Market** (`ladipo-auto-hub`), **Synagogue / Ikotun Market** (`ikotun-market`), **Alimosho General Hospital** (`alimosho-hospital`), **Ogba/Fagba Plaza** (`ifako-ogba-hub`), **Chairman Kazeem** hub (`alimosho_hub`) & `oshodi_dispatch` job |
| **Festac, Trade Fair & Southwest Industrial Axis** | **Done** (`ojo-badagry.js`) | **Amuwo-Odofin** (Festac Town 1st–7th Avenues, Mile 2, Satellite Town, Abule-Ado), **Ojo East** (Alaba International Market, Trade Fair Complex / ASPAMDA, Volkswagon / Iyana-Iba) | **Festac ’77 Estate & Festival Mall** (`festac-77-mall`), **Alaba International Electronics Market** (`ojo-alaba`), **Lagos International Trade Fair Complex · ASPAMDA** (`trade-fair-aspamda`), **Mile 2 Tank Farm** (`mile2-tank-farm`), **Chief Obinna** hub (`amuwo_trade_hub`) & `aspamda_clearing` job |
| **Northeast Mainland & Lagoon Rim** | **Done** (`kosofe-magodo.js`) | **Kosofe** (Ojota, Ketu, Mile 12, Magodo GRA Phase 1 & 2, Ogudu, Ikosi, Oworonshoki), **Somolu / Bariga deep grid** (`east-mainland.js`) | **Mile 12 Perishable Food Market** (`mile12-market`), **Ojota Chemical Market & Interstate Motor Park** (`ojota-motor-park`), **Magodo Gated Luxury Estates** (`magodo-phase2-club`), **Oworonshoki Lagoon Jetty** (`oworonshoki-jetty`), **Alhaji Danjuma** hub (`kosofe_mile12_hub`) & `mile12_produce` job |
| **Eastern Peninsula, Free Trade Zone & Epe** | **Done** (`lekki.js` & `ikorodu.js`) | **Ibeju-Lekki** (Sangotedo, Lakowe, Eleko, Lekki Free Trade Zone, Akodo), **Epe** (Epe Marina, Mojoda, Poka, Eredo), **Ikorodu Division** (Ijede, Imota, Igbogbo, Baiyeku, Agbowa) | **Dangote Refinery & Petrochemicals Complex** (`dangote-refinery`), **Lekki Deep Sea Port** (`lekki-deep-port`), **Epe Fish Market & Waterfront Resort** (`epe-fish-market`, `epe-waterfront-resort`), **Imota Rice Mill** (`imota-rice-mill`), **Lekki–Epe Int'l Airport** (`lekki-epe-airport`), **Engr. Tayo** hub (`ibeju_epe_hub`) & `refinery_haulage` job |
| **Badagry Heritage & ECOWAS Border Axis** | **Done** (`ojo-badagry.js`) | **Badagry** (Badagry Town, Ajara, Topo Island, Seme-Krake Border), **Snake Island & Tarkwa Bay** (boat-accessible islands) | **First Storey Building & Point of No Return Museum** (`first-storey-badagry`), **Seme–Krake ECOWAS International Border Post** (`seme-krake-border`), **Tarkwa Bay Beach & Snake Island Shipyard** (`tarkwa-snake-island`), **Comptroller Seye** hub (`badagry_border_hub`) & `seme_customs` job |

### 3.2 District Authoring Pipeline (`src/data/districts/` → `lagos.json` → `WorldBuilder.cs`)

1. **Modular District Definition (`createArea` in `src/data/districts/area.js`)**: Each LGA/corridor is authored as a standalone module in `src/data/districts/<district>.js` via `createArea()`, defining:
   - `id`, `name`, `state`, `bounds`, `spawn`, and nested `regions` (`[xMin, xMax]`, `[zMin, zMax]`).
   - `roads.h` and `roads.v` with `ROAD_CLASS` (`expressway`, `highway`, `main`, `commercial`, `residential`, `market`, `bridge`) and segment-level street names (`ROAD_SEGMENTS`).
   - OpenStreetMap-projected street coordinates (matching the `surulere.js` pipeline) for authentic street layouts and real bus stops.
   - `landmarks`, `busStops`, `properties`, `cells` (`style: 'festac' | 'magodo' | 'ladipo' | 'epe' | 'vi' | 'lekki' | 'yaba' | 'island'`), `kiosks`, `vendors`, `footbridges`, `water`, and `uTurns`.
2. **Automated Collision & Footprint Solver (`lagos.js` & `scripts/export-world.mjs`)**:
   - `moveBuildingsClearOfRoads()` in `src/data/districts/lagos.js` and `npm run check` (`scripts/check-data.mjs`) validate that every landmark, property, and bus stop clears all road widths, bridges, and water bodies before exporting `unity/Assets/Rise/Resources/world/lagos.json` (`323 places, 119 roads, 85 regions, 102 compound cells, 106 contacts, 34 jobs, 37 states, 0 errors`).
3. **Neighbourhood Identity, Regional Housing & 15 Story Chains (`WorldBuilder.cs` & `Session.Hustle.cs`)**:
   - **District & Multi-State Hustle Hubs**: 106 placed contacts (`ContactSystem.cs`) including dedicated Lagos Megacorridor Hubs (`alimosho_hub`, `amuwo_trade_hub`, `kosofe_mile12_hub`, `ibeju_epe_hub`, `badagry_border_hub`) and Multi-State Geopolitical Hubs (`southwest_ogun_oyo_hub`, `abuja_federal_hub`, `niger_delta_oil_hub`, `eastern_commerce_hub`, `northern_trade_hub`).
   - **15 Three-Chapter Neighbourhood & Multi-State Story Chains** (`StoryChains` in `Session.Hustle.cs`): `surulere_chain`, `yaba_chain`, `island_chain`, `makoko_chain`, `ikeja_chain`, `alimosho_chain`, `amuwo_chain`, `kosofe_chain`, `ibeju_chain`, `badagry_chain`, `southwest_chain`, `abuja_chain`, `niger_delta_chain`, `eastern_chain`, and `northern_chain`.
   - **Region-Specific Housing Cells (`WorldBuilder.BuildCells`)**: `festac` (Festac ’77 medium-rise apartment blocks), `magodo` (Magodo GRA twin-duplex compounds with security gatehouses), `ladipo` (auto-parts & trade warehouses with zinc canopies), and `epe` (Epe waterfront fishing & timber veranda compounds).

---

## 4. Expansion Roadmap — Other Nigerian States & Geopolitical Zones

Beyond Lagos State, **Rise: Hustle or Die Trying** expands across Nigeria's **6 Geopolitical Zones** using a hybrid of **contiguous interstate highways** (driveable end-to-end with FRSC, Customs, Police, and Military checkpoints) and **multimodal fast-travel hubs** (airports, NRC standard-gauge trains, luxury interstate bus terminals, and coastal/river ferries).

### 4.1 Phased Multi-State Rollout (All 5 Phases Built in `src/data/states/` & Merged into `lagos.json`)

| Phase | Status | State(s) & Zone | Entry Connection from Lagos | Cities, Districts & Landmarks | Exclusive Gameplay, Economy & Factions |
|---|---|---|---|---|---|
| **Phase 1: South-West Corridor** | **Done** (`ogun.js` & `oyo.js`) | **Ogun State** & **Oyo State** (South-West) | Driveable via **Lagos–Ibadan Expressway (`v[0]`)**, **Abeokuta Expressway (`v[-300]`)**, **Ota–Sagamu–Benin Link (`h[-1680]`)**, & **NRC Standard-Gauge Train** (`ebute-rail` → `abeokuta-rail` → `ibadan-rail`) | **Ogun**: Mowe–Ibafo & Redemption Camp (`redemption-camp`), Sagamu Interchange (`sagamu-toll`), Ota/Agbara Industrial Hub (`ota-industrial`), Abeokuta (`olumo-rock`, `oke-mosan`, `abeokuta-rail`, `panseke-bus`).<br>**Oyo (Ibadan)**: Challenge (`challenge-bus`), Dugbe & Cocoa House (`cocoa-house`, `amala-skye-dugbe`), Bodija Market (`bodija-market`), University of Ibadan (`ui-gate`), Mapo Hall (`mapo-hall`), Iwo Road (`iwo-road-bus`), Moniya NRC (`ibadan-rail`) | **Chief Akinwale** hub (`southwest_ogun_oyo_hub`), `ota_ibadan_haulage` job, 3-chapter `southwest_chain` story arc, UI Agbowo Tech & Policy Colloquium (`OpenSchoolMenu`), Ota factory depot & Olumo/Mapo heritage tours |
| **Phase 2: Federal Capital** | **Done** (`fct.js`) | **FCT Abuja** (North-Central) | Flights from **MMA (`ikeja-airport`) / Lekki–Epe (`lekki-epe-airport`)** to **Nnamdi Azikiwe Int'l Airport (`abuja-airport`)**, **Idu NRC Rail (`abuja-rail`)**, or **A1/A2 Federal Highway (`v[0]`)** via Zuba Gate (`abuja-zuba-gate`) | **Three Arms Zone** (`aso-rock-villa`, `nass-complex`), **Central Business District** (`cbn-hq-abuja`, `efcc-hq-abuja`, `nnpc-towers`), **Wuse Market** (`wuse-market`), **Maitama & Asokoro** (`maitama-transcorp`), **Garki & Jabi** (`jabi-lake-mall`, `utako-bus`, `nyanya-kubwa-bus`) | **Senator Danladi Musa** hub (`abuja_federal_hub`), `federal_tender_convoy` job, 3-chapter `abuja_chain` story arc, CBN HQ Treasury Bills, EFCC HQ Grand Tribunals, Executive Private Jet Charter (`OpenAirportMenu`) |
| **Phase 3: Oil, Gas & Niger Delta** | **Done** (`rivers.js`) | **Rivers State**, **Delta State** & **Edo State** (South-South) | Driveable via **Lagos–Calabar Coastal Highway (`h[300]`)** & **East–West Road (`h[240]`)**, or flights to **Port Harcourt Int'l Airport (`ph-airport`)** | **Port Harcourt**: Old & New GRA (`ph-gra-lounge`), Trans-Amadi Industrial Layout (`trans-amadi-yard`), Mile 1 & Mile 3 Market (`mile1-market`), **Bonny Island LNG Terminal** (`bonny-lng`), **Onne Oil & Gas Free Zone** (`onne-oil-port`), `waterlines-bus`.<br>**Benin & Warri**: Benin Ring Road & Igun Bronze Guild (`benin-igun-bronze`, `benin-ring-bus`), Warri Refinery & Escravos (`warri-refinery`) | **Engr. Tamuno Briggs** hub (`niger_delta_oil_hub`), `bonny_lng_offshore` job, 3-chapter `niger_delta_chain` story arc, Bonny/Onne/Warri petrochemical depot operations, PH New GRA VIP nightlife |
| **Phase 4: Eastern Commerce & Industry** | **Done** (`anambra.js`) | **Anambra State**, **Enugu State** & **Abia State** (South-East) | Driveable via **Sagamu–Benin–Asaba Highway (`h[-1680]` / `v[1980]`)** across **River Niger Bridgehead (`niger-bridge-gate`)**, or flights to **Akanu Ibiam / Anambra Airport (`enugu-anambra-airport`)** | **Anambra**: Onitsha Main Market (`onitsha-main-mkt`), Niger Bridgehead (`niger-bridge-gate`), Upper Iweka (`upper-iweka-bus`), Nnewi indigenous auto plant (`nnewi-auto-plant`).<br>**Enugu**: Independence Layout (`enugu-lion-building`), Ogui/New Haven (`ogui-new-haven-bus`).<br>**Abia (Aba)**: Ariaria International Market (`ariaria-market`) | **Chief Ebuka Nwosu (Odogwu)** hub (`eastern_commerce_hub`), `onitsha_nnewi_trade` job, 3-chapter `eastern_chain` (*Igba Boi to Industrial Titan*) story arc, Onitsha/Ariaria wholesale container flipping & Nnewi vehicle assembly |
| **Phase 5: Northern Trade & Frontier Ops** | **Done** (`kano.js`) | **Kano State**, **Kaduna State** & **Borno State** (North-West & North-East) | Flights to **Mallam Aminu Kano Int'l Airport (`kano-airport`)**, **Kaduna–Kano NRC Train (`kano-rail`)**, or **A2 Northern Trunk Highway (`v[0]`)** via Zaria Gate (`kano-zaria-gate`) | **Kano**: Kurmi Ancient Market & Wapa BDC FX (`kurmi-market`), Emir's Palace & Durbar Grounds (`emirs-palace-kano`), Dawanau International Grains Market (`dawanau-grains`), Sabon Gari (`sabon-gari-park`).<br>**Kaduna**: Kakuri Industrial Works (`kaduna-kakuri-works`), Barnawa/Zaria (`barnawa-zaria-bus`).<br>**Borno (Maiduguri)**: Monday Market (`maiduguri-monday-mkt`), Giwa Barracks & Lake Chad JTF Forward Base (`jtf-fob-north`) | **Alhaji Aminu Dantata** hub (`northern_trade_hub`), `dawanau_trans_saharan` job, 3-chapter `northern_chain` story arc, Emir's Palace Durbar tours, and JTF Northern Frontier Command operations (`OP LAFIYA DOLE` & `OP HADARIN DAJI`) |

### 4.2 Interstate Transit & Border Mechanics (`Session.Places.cs` & `Session.Hustle.cs`)

1. **Driveable Interstate Highways & Checkpoints (`OpenCheckpointMenu`)**:
   - Major trunk corridors (`A1/A2` Lagos–Ibadan–Abuja–Kano `v[0]`, `A121` Ota–Sagamu–Benin–Onitsha `h[-1680]` / `v[1980]`, and `Lagos–Calabar Coastal Highway` `h[300]`) connect state maps through interactive Highway Border Gates (`berger-gate`, `sagamu-toll`, `seme-krake-border`, `niger-bridge-gate`, `abuja-zuba-gate`, `kano-zaria-gate`) staffed by **FRSC**, **Nigeria Customs Service**, **NDLEA**, and **Military JTF**.
   - At any checkpoint (`OpenCheckpointMenu`), players can present vehicle papers & waybills (clearing 1 Heat and earning Public Rep), stamp Interstate Haulage & Customs Manifestos (`₦5,000`), or run Joint Highway Escort & Anti-Smuggling Patrols (`+₦28,000`).
2. **Airports, NRC Rail & Interstate Motor Parks (`OpenAirportMenu`, `OpenRailMenu`, `OpenInterchangeMenu`, `OpenStatesDirectory`)**:
   - **Air Travel (`OpenAirportMenu`)**: Book domestic commercial flights (`₦15,000–₦32,000`) across all 6 Nigerian airports (`ikeja-airport`, `lekki-epe-airport`, `abuja-airport`, `ph-airport`, `enugu-anambra-airport`, `kano-airport`) or charter a **Private Executive Jet** (`₦75,000`, +5 Business Rep, +3 Social Rep).
   - **NRC Rail Network (`OpenRailMenu`)**: Board Lagos Blue/Red Line Metro trains (`marina-rail`, `theatre-rail`, `ebute-rail`, `₦500`) or **NRC Standard-Gauge Interstate Express Trains** (`₦3,500–₦12,000`) connecting Mobolaji Johnson Station (`ebute-rail`) ↔ Abeokuta (`abeokuta-rail`) ↔ Ibadan Moniya (`ibadan-rail`) ↔ Abuja Idu (`abuja-rail`) ↔ Kaduna/Kano (`kano-rail`).
   - **Interstate Luxury Bus Terminals (`OpenInterchangeMenu` & `OpenStatesDirectory`)**: Express BRT shuttles across Lagos terminals (`oshodi-interchange`, `ojota-motor-park`, `mile-2`, `ajah-town`, `ikorodu-garage-town`, `agege-garage`) and Interstate Luxury Coaches to Abeokuta (`panseke-bus`), Ibadan (`iwo-road-bus`), Abuja (`utako-bus`), Onitsha (`upper-iweka-bus`), Port Harcourt (`waterlines-bus`), and Kano (`sabon-gari-park`), plus direct travel to all 36 States & FCT via `OpenStatesDirectory`.

---

## 5. Technical Architecture for Multi-District & Multi-State Scale

Scaling from a single monolithic city scene to all 20 Lagos LGAs and multiple Nigerian states requires four core upgrades across `src/data/` and `unity/Assets/Rise/Scripts/`:

### 5.1 Multi-State Data Schema (`src/data/states/` & `Resources/world/lagos.json`)
- `createArea()` in `src/data/districts/area.js` tags `META.state`, `PROPERTIES`, and `CELLS`, and `src/data/states/` (`index.js`, `ogun.js`, `oyo.js`, `fct.js`, `rivers.js`, `anambra.js`, `kano.js`) defines the 6 Geopolitical Zone maps merged by `src/data/districts/lagos.js`.
- `npm run export` (`scripts/export-world.mjs`) validates and exports the unified `unity/Assets/Rise/Resources/world/lagos.json` (`323 places, 119 roads, 85 regions, 102 cells, 106 contacts, 34 jobs, 37 states`) and supports per-state manifest splitting as additional states are added.

### 5.2 Spatial Chunk Streaming & Floating-Origin Rebasing (`WorldBuilder.cs` & `WorldStreamer.cs`)
- **Spatial Grid Chunking**: Instead of building the entire state geometry in a single `WorldBuilder.Build()` pass, partition roads, housing plots, street furniture, and static batch groups into **500 m × 500 m spatial cells (`WorldChunk`)**.
- **Active Radius Streaming**: `WorldStreamer` loads a `3 × 3` grid of full-detail chunks around the player (with static batching per chunk) and low-poly LOD skyline proxies for distant chunks, keeping memory and draw calls constant regardless of how many districts or states exist.
- **Coordinate Rebasing**: Store global positions as `(stateId, Vector2 worldXZ)` and rebase the Unity scene origin when crossing state highway portals or exceeding `±4000 m` from origin to prevent floating-point jitter in physics and shaders.

### 5.3 Regional Architecture, Biomes, Weather & Audio
- **Biome & Architectural Palettes (`WorldBuilder.cs`)**:
  - *Lagos Coastal & Island*: Afro-Brazilian stucco, glass towers, lagoon stilt settlements, yellow/black danfo corridors.
  - *South-West Hinterland (Ogun/Oyo)*: Red laterite earth, hilly topography (Olumo Rock, Ibadan seven hills), rust-brown corrugated roofs, ancient compound walls.
  - *Abuja (North-Central)*: Wide 6–8 lane boulevards, granite monoliths (Aso Rock, Zuma Rock), modern ministerial complexes, manicured green belts.
  - *South-South (Rivers/Delta)*: Mangrove creeks, flared gas stacks on the horizon, bridges, industrial pipeyards, tropical wet-season downpours.
  - *South-East (Onitsha/Enugu/Aba)*: Multi-storey concrete market plazas, red-earth escarpments, dense commercial workshops.
  - *North (Kano/Kaduna/Borno)*: Sahelian ochre earth, traditional Tubali mud-brick architecture and city gates (*Kofar*), date palms and baobabs, dry Harmattan dust skies.
- **Regional Weather & Ambience (`WeatherSystem.cs` & `SoundSystem.cs`)**:
  - State-specific climate tables (heavy coastal rain in Lagos/Port Harcourt vs. intense Harmattan haze in Kano/Maiduguri).
  - Regional street ambience, local language greetings (Yoruba, Pidgin, Igbo, Hausa, Efik/Ijaw), and regional music synthesis (Afrobeats/Jùjú/Fuji in South-West, Highlife/Ogene in South-East, Port Harcourt Dancehall in South-South, Goje/Kakaki in the North).

### 5.4 Per-State Multiplayer Sharding & Economy Sync (`Net/MultiplayerManager.cs` & `CloudEconomy.cs`)
- Shard Supabase Realtime channels by `stateId:districtId` (`rise:lagos:surulere`, `rise:abuja:wuse`, `rise:rivers:ph-gra`) so local player sync stays low-latency while crew chat and shared crew treasuries remain global.
- Extend `CloudEconomy.cs` and `/admin` with state-level commodity price multipliers (e.g. cheaper farm produce in Mile 12/Kano/Benue, cheaper electronics in Alaba/Computer Village, cheaper refined fuel near Ibeju-Lekki/Warri, higher luxury property yields in Ikoyi/Maitama) to power genuine interstate trade and arbitrage.
