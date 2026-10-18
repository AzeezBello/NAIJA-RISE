# Rise: Hustle or Die Trying · Product Plan

Working title in the PRD: **Lagos Life**. Shipping name in this repo: **Rise: Hustle or Die Trying**.
Original IP: original characters, missions, story and systems. The inspiration is open-world action plus Lagos-style life simulation; districts use real Lagos place and street names on a stylised map.

Pitch: **Build your life. Build your empire. Survive the city.**

---

## 1. Where we are — Alpha 1.0 (October 2026)

The PRD's §25 "Version 0.1" MVP list, checked against the current Unity build:

| PRD MVP item | Status | Notes |
|---|---|---|
| Lagos district network | **Done** | Surulere, Ikoyi, Lekki/Ajah/Eleko, Ikorodu, Apapa, Ikeja, Oyingbo, Yaba/Alagomeji, Ajegunle, Makoko, Agege and Ojo/Badagry; Computer Village, New Afrika Shrine, Kalakuta Republic, Bar Beach, Oniru and Elegushi/Quilox |
| One playable character | **Done** | Customisable skin, hair, outfit, fabric print, body type, facial hair, accessories (Character app) |
| Lagos NPC variety | **Done** | Pedestrians with daily schedules, agberos, students, service agencies (Police, Army, LASTMA, LAWMA, VIO, KAI, Civil Defence, FRSC), artisans, night hustlers, owambe crowd and animals; 64 named contacts including 32 Surulere street contacts |
| 5 vehicles | **Done (17)** | Sedan, SUV, hatchback, taxi, danfo, korope, keke napep, okada, BRT, police, fire truck, ambulance, van, delivery truck, LAWMA truck, army truck, fuel tanker |
| 10 jobs | **Done (18)** | Plus Market Porter, POS Agent, Bouncer, Tanker Driver, Web Freelancer, Graphics Freelancer, Junior Coder, IT Support Technician; pay scales with Driving / Business / Charisma / Fitness / Strength skills |
| Missions | **Done** | Prologue, Hot Delivery, Crossroads and reputation-gated Amaka/Baba K arcs, plus repeatable timed deliveries across 17 district hubs and 32 Surulere street contacts |
| Basic economy | **Done** | Cash, RiseBank, business income, employee shift scheduling, offline "Lagos Never Sleeps" earnings, fines, tickets, POS withdrawals |
| Housing | **Done** | Room, self-contain, flat, duplex in fenced compounds; rent via Agent Kunle (10% fee, 30-day lease) or buy; let owned homes to tenants; home upgrades and tenant complaint repairs; hotel rooms at Rita Lori; enterable 3D interiors |
| Inventory | **Done** | Consumables, protection weapon, laptop, and mission items |
| Character customisation | **Done** | 11 customisation slots with procedural Nigerian fabric prints and live HUD portrait |
| Day/night cycle | **Done** | Sun, moonlit night, street lights, NEPA outages, rain, storms, and harmattan haze |
| Basic multiplayer | **Done** | Rooms per district, player sync, crews, shared GPS pins, co-op racing, and chat over Supabase Realtime (`unity/Assets/Rise/Scripts/Net/`) with offline loopback fallback |

### Codebase

- `unity/` — Unity 6000.6.5f1 project (Universal Render Pipeline 17.6, Input System 1.19, glTFast 6.0.1):
  - `Assets/Rise/Scripts/Data/` — loads `Resources/world/lagos.json` exported from `src/data/`
  - `Assets/Rise/Scripts/World/` — procedural city builder, bridges, landmarks, airport, Makoko stilt settlement, traffic, pedestrians, contacts, animals, weather, dynamic events, traffic lights, law enforcement, Dijkstra GPS navigation, quality governor
  - `Assets/Rise/Scripts/Entities/` — Ready Player Me and CesiumMan character rigs, procedural Nigerian fabric prints, 11-slot wardrobe
  - `Assets/Rise/Scripts/Player/` & `Vehicles/` — character controller, third-person camera, GLB vehicle loader, arcade driving physics
  - `Assets/Rise/Scripts/Story/` & `Session*.cs` — story missions, jobs, housing, businesses, transit, tolls, places, 3D interiors, hustle hubs, family, relationships, street life, crews, smartphone with 12 apps
  - `Assets/Rise/Scripts/UI/` — dark-glass HUD, minimap, live portrait, touch controls, procedural synthesised audio (`SoundSystem.cs`)
  - `Assets/Rise/Scripts/Net/` — Supabase Auth accounts, cloud save sync, district Realtime multiplayer, and loopback transport
- `src/data/` — shared map and game data modules exported to `unity/Assets/Rise/Resources/world/lagos.json` via `npm run export:unity`.
- `web/` — Next.js 16 / React 19 / TypeScript companion website (landing page, `/play` WebGL embed, `/account`, `/admin`).
- `supabase/` — PostgreSQL schema (`players`, `saves`, `crews`, `crew_members`) with row-level security.

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

---

## 3. Next Steps — Alpha 1.1 & Console Readiness

1. **Live Supabase Deployment** — provision the production Supabase project, apply `supabase/schema.sql`, enable Realtime and email auth, and configure `unity/Assets/Rise/Resources/cloud.json` and `web/.env`.
2. **Co-op Getaway & Dynamic Encounters** — extend crew co-op from street racing to multi-player getaway and convoy missions; add neighbourhood story chains.
3. **Admin Dashboard Editing** — allow `/admin` in `web/` to edit job payouts, mission rewards, and economy constants in Supabase without a client rebuild.
4. **Recorded Audio & Custom Blender Rig** — layer recorded Lagos street ambience and Owambe music behind the Sound toggle, and expand character animations with dedicated jump, turn, and vehicle enter/exit clips.
5. **Native Console & Mobile Builds** — expand Input System action maps (`Resources/Input/Rise.inputactions`) and platform build targets (macOS, Windows, WebGL, iOS/Android, PlayStation, Xbox, Nintendo Switch).