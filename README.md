# RISE — Lagos · Alpha 1.0

An open-world life simulation set in a living Nigeria. Original IP: original characters, missions and story, with real Nigerian place and street names on a stylised map.

**Build your life. Build your empire. Survive the city.**

See [PLAN.md](PLAN.md) for the product plan, completed systems, and upcoming roadmap, and [unity/README.md](unity/README.md) for Unity architecture and build instructions.

## Game (`unity/`)

The game lives in [unity/](unity/README.md): a Unity 6 project (Universal Render Pipeline 17.6, Input System 1.19, glTFast 6.0.1) built from the shared data files in `src/data/`. `npm run export:unity` exports the district map, jobs, contacts, vehicles, businesses, courses and rules from `src/data/` to `unity/Assets/Rise/Resources/world/lagos.json`. C# runtime systems build the city, 3D interiors, driving physics, rigged characters (Ready Player Me and CesiumMan), Kenney and Lagos vehicle GLBs, story missions with Dijkstra GPS routing, law enforcement, housing, business management with employee shifts, education, street football, synthesized audio, offline earnings, and Supabase account / cloud-save / district-multiplayer / crew systems.

```bash
npm run export:unity        # export src/data → unity/Assets/Rise/Resources/world/lagos.json
open unity                  # open Assets/Rise/Scenes/Lagos.unity in Unity 6000.6 and press Play
python3 webgl_server.py     # serve a WebGL build from unity/Builds/WebGL with gzip headers
```

## Website (`web/`)

Next.js 16 site (landing page, `/play`, `/account`, `/admin`), Turbopack in dev and build:

```bash
cd web && npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Render deploys this site from the repo root: its build command (`yarn`) runs the root `postinstall`, which builds `web/` when `RENDER` is set (`scripts/render-build.mjs`), and `yarn start` runs `next start` on Render's `PORT`. Set the `NEXT_PUBLIC_SUPABASE_*` and service-role variables from `web/.env.example` in the Render dashboard for `/account` and `/admin`, and set `NEXT_PUBLIC_WEBGL_URL` to your hosted HTML5 embed URL (packaged with `npm run package:webgl` → `unity/Builds/Rise-Lagos-WebGL.zip`) so `/play` streams the Unity WebGL build. On other hosts use `npm run build` then `npm start` from the root.

## Features in Alpha 1.0

**Corridors & Districts** — **Falomo Bridge** carries Marina south over Five Cowrie Creek into **Victoria Island** (Civic Centre, RiseBank VI, The Yellow Chilli, Eko Hotel, the Eko Atlantic shore with its palm line, Adeola Odeku, Ahmadu Bello Way, Akin Adesola) and past the **Lekki Toll Gate** onto the Lekki–Epe Expressway through **Lekki Phase 1**, **Ajah**, and **Eleko Beach**. **Third Mainland Bridge** carries Broad Street north over the lagoon into **Yaba** (Tejuosho Market, Yaba Tech, the UNILAG gate, Jibowu bus stop, Herbert Macaulay and Murtala Muhammed Way), and **Ikorodu Road** runs the full width of the mainland from Jibowu through **Ebute Metta** to **Ikorodu Garage**, joined to Surulere by Western Avenue. The western and northern corridors include **Apapa** (port and Tincan Island), **Ajegunle (AJ City)**, **Makoko** (lagoon stilt settlement and canoe docks), **Oyingbo**, **Ikeja** (Computer Village, New Afrika Shrine, Kalakuta Museum, and Murtala Muhammed Airport with terminal, control tower, runway and parked aircraft), **Agege**, and **Ojo / Badagry Expressway** (Alaba International Market, LASU).

**Natural Lagos Light & Graphics Compatibility** — Universal Render Pipeline with an HDR frame, soft bloom on street lights at night, ACES tone mapping, and a realtime reflection probe so car paint and wet night asphalt reflect the sky and lamps. `World/QualityGovernor.cs` auto-detects the GPU (Low, Medium, High) and steps down automatically when frames stay slow, with four-step dynamic resolution scaling.

**Vehicles & Dressed-Up Houses** — 17 vehicle classes powered by Meshopt-compressed GLB models (`Resources/Models/Vehicles`): sedans, SUVs, hatchbacks, taxis, danfo, korope, keke napep, okada, BRT, police cruisers, LAWMA garbage trucks, fire trucks, ambulances, army trucks, and fuel tankers. Dayo at Ladipo sells vehicles, services condition, sells insurance (half repair cost, half crash damage), applies liveries and danfo slogans, and sells a protection weapon required to hijack commercial vehicles. Houses feature compound fences, water tanks, split-unit ACs, balconies, and generators.

**Education & Career Progression** — Surulere Cyber Café teaches five certificate courses (web design, graphic design, coding, POS and bookkeeping, defensive driving) that unlock gated jobs (Web Freelancer, Graphics Freelancer, Junior Coder) and freelance gigs. Community Grammar School runs an evening adult class, and Yaba Tech offers a three-semester Computer Systems diploma that unlocks the IT Support Technician job.

**People, Wardrobe & Relationships** — 64 named contacts (including 17 district hustle hubs and 32 Surulere street contacts on their real streets) and ambient pedestrians (with trader, office, youth, and wander schedules) use the Ready Player Me and Khronos CesiumMan rigs with 11 customisation slots and procedural Nigerian fabric prints (ankara, adire, aso-oke, lace, Super Eagles jersey). Mama Tunde and Chioma follow daily routines at the family compound and raise household requests. Every contact tracks trust and respect across relationship tiers (`stranger`, `known`, `friend`, `close`).

**Living Places & Enterable Interiors** — Surulere Fitness Gym (cardio, weights, personal trainer, boxing sparring), restaurants, Adeniran Ogunsanya Mall (outfits, supermarket groceries, laptop, barber, cinema), RiseBank branches, nightlife clubs and bars (20:00–04:00), Saturday Owambe parties at Surulere Event Centre (spray ₦5,000), churches and mosques (pray to clear 1 Heat), Rita Lori Hotel, Area C Police Station (settle fines), PHCN office (pay for generator diesel during NEPA outages), POS kiosks (pure water, suya, ₦20,000 cash withdrawal), roadside vendors, and enterable 3D interiors for homes, shops, and offices.

**Businesses, Property & "Lagos Never Sleeps"** — Four properties to rent through Agent Kunle or buy from the landlord (let out extra homes to tenants, fix tenant complaints, install generator/water tank/security upgrades). Four businesses to buy, restock, price-tune, and staff with up to three employees on configurable shifts (`morning`, `afternoon`, `night`, `all-day`). While you are away, businesses and tenants continue earning into RiseBank (up to 8 hours).

**Smartphone & GPS** — 12 phone apps: Messages, Jobs, RiseBank, Property, Businesses, Character, Contacts, Inventory, Crew, Account, Settings, and Map · GPS (search any landmark, bus stop, property, or contact and set a live GPS waypoint).

**Audio** — Procedural synthesised engine hum pitched to vehicle speed, rain ambience, generator drone during NEPA outages, crash horn, and cash transaction chime (`Scripts/UI/SoundSystem.cs`), toggleable in Settings.

## Controls

| Input | On foot | Driving |
|---|---|---|
| WASD / arrows, left stick | Move | Throttle & brake (W/S), steer (A/D) |
| Right trigger / left trigger | | Gas / brake |
| Shift, Square (X) | Sprint | Boost |
| Space, Triangle (Y) | Jump | Handbrake (Space, Circle) |
| E, Cross (A) | Talk, enter, take, buy, deliver | Exit, deliver, refuel (when stopped) |
| P, Tab, Select | Open / close phone | Open / close phone |
| T, Enter | District multiplayer chat | |
| X, Backspace, Circle (B) | Close menu | |
| 1–9 | Pick menu option | |
| Mouse, right stick, Z / C | Orbit camera | Orbit camera |

## Project Layout

```
unity/                   Unity 6 project (the game); see unity/README.md
src/data/                shared map and content data (districts/, config, jobs, characters, vehicles, family,
                         businesses, items, crew, schedules), exported to unity/ by scripts/export-world.mjs
scripts/                 export-world.mjs (src/data → unity/Assets/Rise/Resources/world/lagos.json), check-data.mjs
supabase/                schema, migrations and SQL tests for accounts, saves and crews
web/                     Next.js 16 / React 19 / TypeScript site (/play, /account, /admin)
webgl_server.py          local server for the Unity WebGL build (gzip headers)
```

Add a new area by creating `src/data/districts/<id>.js` with the same exports as `surulere.js`, registering it in `districts/index.js` and `districts/lagos.js`, then running `npm run export:unity`.

## QA

- `npm run check`: `node --check` on every data module plus the place, job and contact reference checks.
- CI ([.github/workflows/web.yml](.github/workflows/web.yml)) fails if `lagos.json` drifts from a fresh export, and builds the Next.js site.
- Unity headless smoke and play tests run locally; see [unity/README.md](unity/README.md).
