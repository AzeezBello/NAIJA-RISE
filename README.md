# NAIJA RISE — Lagos · Alpha 0.7

A browser-playable open-world life simulation set in a living Surulere, Lagos. Original IP: original characters, missions and story, with real Lagos place and street names on a stylised map.

**Build your life. Build your empire. Survive the city.**

See [PLAN.md](PLAN.md) for the product plan, what is done, and the next phase.

## Play

Static build (no install):

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Next.js 16 shell (landing page, `/play`), Turbopack in dev and build:

```bash
npm install          # repo root: the engine's own `three` dependency
cd web && npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Three.js and fonts load from CDNs in the static build, so an internet connection is required for the first load; a service worker then caches the shell and the page installs as a PWA. Progress saves to the browser (localStorage).

## What is in Alpha 0.7

**The city** — Surulere grid with Bode Thomas Street, Adeniran Ogunsanya Street, Ogunlana Drive, Funsho Williams Avenue and Itire/Ojuelegba Road, street signs at every junction. Ojuelegba Junction, Kilo, Shitta and Mushin bus stops, Yaba, Shitta and Mushin markets, National Stadium, Ladipo Garage, Marina, Area C Police Station, Fire Service, Army Barracks, LAWMA depot, FRSC checkpoint, LASTMA post, two RiseBank branches, Forties Bar, Lust Club, The Crib, Rita Lori Hotel, a school, Grace Chapel, Surulere Central Mosque, PHCN office, Mobil filling station, Surulere Event Centre, POS kiosks, three properties.

**Traffic and vehicles** — danfo, korope, keke napep, okada, BRT, sedans, police cars, LAWMA trucks and fuel tankers follow the road grid with lane discipline, braking and random turns. Drivable: sedan, danfo, keke, korope, fire truck, army truck. Go-slow jams appear on named roads.

**People and animals** — pedestrians, agberos at bus stops (pay the levy or risk heat; a pet dog keeps them away), police, soldiers, firemen, LAWMA sweepers, LASTMA and FRSC officers, school kids by day, an owambe crowd by night, goats, chickens and stray dogs.

**Housing** — Surulere compounds: mostly bungalows with zinc roofs and 2–3 storey houses behind fences and gates, a few high-rises along Bode Thomas and Funsho Williams. Four homes to rent or buy (room, self-contain, flat, duplex). Agent Kunle at every gate takes a 10% fee on a 30-day lease; the landlord sells outright; owned homes you do not live in can be let to tenants who pay every morning. Leases expire with a warning three days out. Owned homes take upgrades (generator, water tank, security) and tenants raise complaints that halve rent until fixed.

**Life** — ten jobs that train four skills (Driving, Business, Charisma, Fitness) and pay more as the skill grows, with skill-gated jobs like POS Agent, Bouncer and Tanker Driver; bank; businesses with named staff, price levels, stock that drains every payout, and a rival trader who undercuts anyone not on low prices; inventory; character customisation; phone with ten apps; five branching story missions including a police-chase delivery; Level titles (Newcomer → Hustler → Entrepreneur → Mogul) with app unlocks at Level 2.

**Story** — after the shared prologue the road forks at Marina: Amaka's legit arc (Public reputation 0+) runs a timed cold-chain delivery, a fragile warehouse run under 90 km/h and the Marina race; Baba K's risk arc (Street 10+) runs a vehicle recovery, a police getaway and a territory race. Missions can fail (spoiled cargo, arrest, losing the race) and be retried.

**Street racing** — Speedy at the Stadium bus stop races two laps on Funsho Williams Avenue for a ₦20,000 wager against a rival driver; winning trains Driving and Street reputation, and LASTMA sometimes clocks you.

**Heat 4 and 5** — the army blocks Funsho Williams and Ogunlana Drive; at arrest the officer offers to settle on the spot (bribe, 60% works); standing at your own gate for ten seconds while wanted makes the patrols move on.

**Reputation** — Public, Business, Street and Social reputations move with what you do (arrests, risk jobs, ownership, owambe, prayer) and show in the Character app.

**Vehicles** — buy okada, keke, korope, danfo or a sedan from Dayo at Ladipo; owned vehicles stay where you parked them between sessions, lose condition in crashes (slower and looser steering), and can be serviced, insured (half-price service, half crash damage), repainted with liveries, or given a danfo slogan. Taking a vehicle that is not yours adds heat.

**Lagos Never Sleeps** — businesses and tenants keep earning while you are away (capped at eight hours); a RiseBank summary greets you on return.

**Law and consequences** — heat decays over time, Heat 3+ triggers police pursuit and arrest, FRSC speeding tickets, the army checkpoint, hitting pedestrians, settling fines at Area C, praying to ease heat.

**City events** — moonlit day/night cycle with lit windows and solar street lights (NEPA outages darken homes but not the streets; pay for diesel at the PHCN office), rain and storms that darken the sky, slow traffic, cut grip and flood the Ojuelegba underpass, harmattan haze on days 7 to 9 of each ten, go-slow, Owambe parties (19:00–23:30), nightlife venues after 20:00. Pedestrians drift to the markets at midday and thin out late at night.

**Audio** — synthesised engine hum, rain, generator drone during outages, horn on crashes and a cash chime, no audio files; toggle in Settings.

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
web/                     Next.js 16 / React 19 / TypeScript shell with a React Three Fiber landing hero
package.json             root: the engine's `three` dependency so web/ can bundle ../src with Turbopack
```

Add a new area by creating `src/data/districts/<id>.js` with the same exports as `surulere.js` and registering it in `districts/index.js`; load it with `?district=<id>`.

## QA

- `node --check` passes for every module.
- Headless Chrome (puppeteer-core) runs with zero page errors: title → city, phone apps, jobs, bank, character, mission dialogue with a branching choice, driving, police pursuit, night lighting, mobile viewport with touch controls; the Next build serves `/` and `/play`.
- Saves from Alpha 0.5 and 0.6 migrate automatically.
- Append `#debug` to the URL to expose `window.__nr` for manual testing.
