# NAIJA RISE — Lagos · Alpha 0.5

A browser-playable open-world life simulation set in a living Surulere, Lagos. Original IP: original characters, missions and story, with real Lagos place and street names on a stylised map.

**Build your life. Build your empire. Survive the city.**

See [PLAN.md](PLAN.md) for the product plan, what is done, and the next phase.

## Play

Static build (no install):

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Next.js shell (landing page, `/play`):

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Three.js and fonts load from CDNs in the static build, so an internet connection is required. Progress saves to the browser (localStorage).

## What is in Alpha 0.5

**The city** — Surulere grid with Bode Thomas Street, Adeniran Ogunsanya Street, Ogunlana Drive, Funsho Williams Avenue and Itire/Ojuelegba Road, street signs at every junction. Ojuelegba Junction, Kilo, Shitta and Mushin bus stops, Yaba, Shitta and Mushin markets, National Stadium, Ladipo Garage, Marina, Area C Police Station, Fire Service, Army Barracks, LAWMA depot, FRSC checkpoint, LASTMA post, two RiseBank branches, Forties Bar, Lust Club, The Crib, Rita Lori Hotel, a school, Grace Chapel, Surulere Central Mosque, PHCN office, Mobil filling station, Surulere Event Centre, POS kiosks, three properties.

**Traffic and vehicles** — danfo, korope, keke napep, okada, BRT, sedans, police cars, LAWMA trucks and fuel tankers follow the road grid with lane discipline, braking and random turns. Drivable: sedan, danfo, keke, korope, fire truck, army truck. Go-slow jams appear on named roads.

**People and animals** — pedestrians, agberos at bus stops (pay the levy or risk heat; a pet dog keeps them away), police, soldiers, firemen, LAWMA sweepers, LASTMA and FRSC officers, school kids by day, an owambe crowd by night, goats, chickens and stray dogs.

**Housing** — Surulere compounds: mostly bungalows with zinc roofs and 2–3 storey houses behind fences and gates, a few high-rises along Bode Thomas and Funsho Williams. Four homes to rent or buy (room, self-contain, flat, duplex). Agent Kunle at every gate takes a 10% fee on a 30-day lease; the landlord sells outright; owned homes you do not live in can be let to tenants who pay every morning. Leases expire with a warning three days out.

**Life** — jobs, bank, businesses, inventory, character customisation, phone with ten apps, branching story missions with dialogue, Level titles (Newcomer → Hustler → Entrepreneur → Mogul) with app unlocks at Level 2.

**Law and consequences** — heat decays over time, Heat 3+ triggers police pursuit and arrest, FRSC speeding tickets, the army checkpoint, hitting pedestrians, settling fines at Area C, praying to ease heat.

**City events** — moonlit day/night cycle with lit windows and solar street lights (NEPA outages darken homes but not the streets; pay for diesel at the PHCN office), go-slow, Owambe parties (19:00–23:30), nightlife venues after 20:00.

**Graphics** — procedural facade, asphalt, concrete and ground textures, sidewalks and curbs, street lights with halos, gradient sky dome with sun and clouds, ACES tone mapping, soft shadows.

**Controls** — keyboard (WASD or arrow keys), mouse camera, touch (joystick and buttons, auto on phones and tablets), gamepad (left stick move/steer, right stick camera, RT gas, LT brake, A interact, B vehicle, Y phone, X sprint, LB handbrake, D-pad dialogue choices).

| Key | Action |
|---|---|
| WASD / arrows | Move, or steer and throttle when driving |
| Shift | Sprint / boost |
| Space | Handbrake |
| E | Interact: talk, work, sleep, bank, POS, pray, refuel, venues |
| F | Enter / exit vehicle |
| J / Esc | Phone open / close |
| 1–3 | Dialogue choices |
| H | Toggle control hints |
| Right-drag, wheel, R | Camera orbit, zoom, reset |

Settings (phone) cover camera sensitivity, minimap rotation, shadows, hints, touch controls, and the mature-content toggle (18+).

## Project layout

```
index.html, styles/      static build (shell + shared styles)
src/                     Three.js engine (ES modules, no bundler needed)
  core/      context, events, state, renderer, input, gamepad
  data/      config, districts/ (surulere), vehicles, characters, jobs, businesses, missions, items
  world/     textures, builders, district, daynight
  entities/  player, vehicles, npcs, animals
  systems/   movement, navigation, dialogue, interaction, economy, vitals, police, events
  ui/        hud, minimap, phone, apps/, touch, components, feedback
  scenes/    manager, title, city
  game.js    createGame({ mount, ui }) — used by main.js and the Next shell
web/                     Next.js 15 / React 19 / TypeScript shell with a React Three Fiber landing hero
```

Add a new area by creating `src/data/districts/<id>.js` with the same exports as `surulere.js` and registering it in `districts/index.js`; load it with `?district=<id>`.

## QA

- `node --check` passes for every module.
- Headless Chrome (puppeteer-core) runs with zero page errors: title → city, phone apps, jobs, bank, character, mission dialogue with a branching choice, driving, police pursuit, night lighting, mobile viewport with touch controls; the Next build serves `/` and `/play`.
- Append `#debug` to the URL to expose `window.__nr` for manual testing.
