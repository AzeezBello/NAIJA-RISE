# NAIJA RISE — Lagos · Alpha 1.0

A browser-playable open-world life simulation set in a living Surulere, Lagos. Original IP: original characters, missions and story, with real Lagos place and street names on a stylised map.

**Build your life. Build your empire. Survive the city.**

See [PLAN.md](PLAN.md) for the product plan, what is done, and the next phase, and [DEPLOY.md](DEPLOY.md) for Vercel deployment.

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

## What is in Alpha 1.0

**Corridors (1.0)** — the map now runs the whole PRD corridor set. **Falomo Bridge** carries Marina south over Five Cowrie Creek into **Victoria Island** (Civic Centre, RiseBank VI, The Yellow Chilli, Eko Hotel, the Eko Atlantic shore with its palm line, Adeola Odeku, Ahmadu Bello Way, Akin Adesola) and on past the **Lekki Toll Gate** onto the Lekki–Epe Expressway and a **Lekki Phase 1** stub on Admiralty Way. **Third Mainland Bridge** carries Broad Street north over the lagoon into **Yaba** (Tejuosho Market, Yaba Tech, the UNILAG gate, Jibowu bus stop, Herbert Macaulay and Murtala Muhammed Way), and **Ikorodu Road** runs the full width of the mainland from Jibowu through **Ebute Metta** to **Ikorodu Garage**, joined to Surulere by Western Avenue. Infrastructure: pedestrian bridges over the expressway, Ikorodu Road and Adeola Odeku; danfo queues at the Costain, CMS and Jibowu terminals; a toll plaza that charges ₦1,200 per crossing (jump it and LASTMA notes your plate); road-construction diversions with cones, barriers and a DIVERSION sign that close a lane for a while; every bridge has the rush-hour profile. Three long-distance jobs (Lekki dispatch, Yaba campus courier, Ikorodu haulage) make the trip the work. Roads, medians, highway lamp posts, street lights, junction signs and traffic lights are all generated from the district data, so the next district (Ikeja, Apapa…) is a data file.

**Natural Lagos light (0.11)** — rendering goes through `src/core/postfx.js` with a light touch: an HDR frame, a soft bloom that only really shows on neon and street lights at night, a neutral grade (no colour tint) and ACES tone mapping. An environment map gives car paint, glass and wet night asphalt reflections. The sky keeps the natural daytime palette with a brighter moonlit night, and a new game starts at 08:30. "Cinematic look" (the bloom pass) can be toggled in Settings; it is off by default on the low-end phone profile.

**Real vehicles and dressed-up houses** — traffic and parked vehicles are now Kenney's CC0 Car Kit models (`assets/vehicles/kenney`, see `assets/LICENSES.md`): sedans, SUVs, hatchbacks and taxis for cars, a garbage truck in LAWMA orange, a fire truck, an olive army truck and a police car with its light bar. The loader (`src/entities/vehicleModels.js`) finds each model's paint on the palette and repaints only that hue, so liveries work on real models and glass, lights and chrome stay put; wheels roll with speed. The danfo and korope are the original hand-built yellow buses with their black stripe, and keke, okada, BRT and the tanker are procedural too; `USE_MODELS` in `src/data/vehicles.js` switches the Kenney models off entirely. Every house now carries Lagos detail: floor ledges, street-side balconies with railings, split-unit ACs, a black water tank and satellite dish on the roof, shop awnings and a generator by the fence.

**Education (1.1)** — the cyber café teaches five courses (web design, graphic design, coding, POS and bookkeeping, defensive driving), each costing money, hours and stamina and paying out skill points, XP and a certificate (`src/systems/education.js`). Certificates unlock Web Freelancer, Graphics Freelancer and Junior Coder jobs, which the Jobs app shows locked with the certificate they need; a freelance gig opens after the first course. Community Grammar School runs an evening adult class, with extra credit once you have paid Chioma's school levy for the family.

**Graphics compatibility** — Settings › Graphics offers Auto, Low, Medium and High. Auto reads the GPU (software and phone GPUs start Low, Intel and unknown chips Medium, Apple M-series, NVIDIA and AMD High) and then steps down one level whenever frames stay slow for a few seconds, with a notice. Levels set pixel ratio, shadow map size, bloom and HDR (High only), reflections, fog distance, how many pedestrians and vehicles are active, and how far characters animate and cast shadows. The HDR target falls back to 8-bit where half-float buffers are unsupported, bloom renders at half resolution, and off-screen characters are no longer drawn.

**People, not buildings** — Baba K, Amaka, Dayo, Mama Nkechi, Oga Driver, Coach Bayo, Coach Emeka, the mall and cyber café attendants and Captain Tunde stand outside their places as real characters (`src/entities/contacts.js`). The current objective's contact carries a bobbing yellow arrow over their head; the mission marker, GPS route, objective distance and the "Talk to…" prompt all point at the person. Contacts turn to face you as you approach.

**Real humans, real clothes** — the player is a Ready Player Me avatar (hoodie, jeans, sneakers, with Ready Player Me's own idle, walk and run clips) and pedestrians mix that body with the Khronos CesiumMan, both streamed from public CDNs: no more armour or mannequins. Clips are never borrowed across skeletons (that folded Mixamo's Michelle in half), so every rig ships its own Idle, Walk and Run. Outfits now cover everyday Lagos wear — ankara shirt, senator, buba and sokoto, agbada, Super Eagles jersey, t-shirt, singlet or tank top with jeans or shorts, jacket and jeans, gown, skirt and blouse — in fabric prints or plain colours, with sneakers on every build; the street draws random outfits, fabrics, skin tones, heights, body types, filas and caps so no two pedestrians look alike. Rigged characters are now on for phones too, preloaded behind the title screen so the city opens with the real character; the primitive body only shows if a download fails. The service-worker cache was renamed so old installs pick up the new engine on their next load.

**Character overhaul (0.10)** — the player and every pedestrian are now instances of one character pipeline (`src/entities/character.js`): a rigged GLB with a Mixamo-compatible skeleton is loaded once, cloned per character with `SkeletonUtils`, and driven by an `AnimationMixer` that cross-fades Idle, Walk and Run from the controller states (`G.moveState`), with clip speed matched to movement speed. The three.js `Soldier.glb` streams in as the development placeholder; drop a production rig at `assets/characters/player.glb` and it takes over (see `assets/characters/README.md` for the rig contract and the recommended Ready Player Me / custom Blender pipelines). Every character starts as the old primitive body so the game runs offline and on low-end phones, and swaps in place when the rig arrives. **Nigerian wardrobe** (`src/entities/wardrobe.js`): outfits are ankara shirt, senator (kaftan), buba and sokoto, agbada, Super Eagles jersey and t-shirt and jeans, in procedural fabric prints — ankara (sunset, emerald, royal), adire indigo, aso-oke stripes, white lace, plain kaftan — plus a tilted fila, face cap, glasses and chain. The default look is an ankara shirt, dark trousers and a fila; pedestrians spawn in the same wardrobe (mostly ankara, buba and senator, a few jerseys), while police, LASTMA, agberos and the other uniforms keep their plain colours. Customisation has eleven slots — skin, face, body type, hair, hair colour, facial hair, outfit, fabric, trousers, shoes, accessory — mapping the fabric print onto the rig's clothing material (or the whole body on the Soldier placeholder) and attaching accessories to the head bone; the Character app and the HUD portrait reflect all of them. Characters cast real skinned shadows; the procedural walk bob and sprint lean only apply to the primitive fallback. Settings has a "Rigged 3D characters" toggle (on by default on desktop, off on the low-end profile).

**Bridges and corridors (0.9)** — the world now runs from Surulere east over the Costain interchange and Eko Bridge, across the Lagos Lagoon, to a first Lagos Island landing: CMS bus terminal, Broad Street, the Cathedral Church of Christ, Tafawa Balewa Square, a Broad Street tower and RiseBank Marina on the real Marina. The National Theatre stands at Iganmu by the Costain roundabout. Shitta Bridge is a flyover carrying Ogunlana Drive over Bode Thomas. Decks, ramps and pillars are real geometry: vehicles, pedestrians, the GPS line and the camera follow the elevation, deck barriers keep you on the bridge, and traffic understands the bridge with a rush-hour profile (crawling 7–10 and 16–19:30, flying at night).

**Living City · Phase 1, streets** — every road has a class (expressway, highway, main, commercial, residential, market) that sets traffic speed, density and LASTMA speed limits. The Apapa–Oworonshoki Expressway runs along the north edge with a concrete median; Funsho Williams is a divided highway. Traffic lights at every junction cycle green, amber and red; traffic stops for them, and running a red near a LASTMA officer costs ₦5,000 or heat. Roadside vendors line Itire Road and the markets. Random road incidents drop an overturned keke into a lane and cause a go-slow.

**Living City · Phase 2, places** — Surulere Fitness Gym (day pass, monthly membership, trainer, boxing once Fitness reaches 20), Chicken Republic (meals restore energy, a business lunch builds Business reputation), the Adeniran Ogunsanya Shopping Mall (outfits, a laptop, supermarket runs, barber, and a cinema with three Nollywood titles that trigger messages), Surulere Cyber Café (learn web design, graphics or coding, then take freelance gigs that pay double with a laptop), and street football at Teslim Balogun Stadium (friendlies, wagers, a neighbourhood tournament and the Lagos championship, with "Omo, you sabi ball!" opening a sponsor line). Every activity moves money, energy, skills, reputation and the clock.

**The Lagos Experience HUD** — a commercial-game layout: brand, district and street top-left; clock, day/night icon and day counter top-right; the objective card with distance and a direction arrow above the minimap; a money and level card bottom-right with ₦ cash, bank, level title, XP and heat; health and energy bars with the interaction prompt bottom-centre. Prompts are explicit verbs: TALK TO BABA K, ENTER DANFO, ENTER GYM, DELIVER THE PACKAGE, CHECK IN, REFUEL.

**Camera and controller feel** — the camera lags subtly on foot and tightens when driving, the look-at eases so it never swings, the FOV widens when sprinting or driving fast, entering a vehicle swings the camera behind it over a second instead of snapping, and occlusion pulls in quickly but eases back out. The player controller runs explicit states (idle, walk, run, turn, stop) with ease-in acceleration, a pivot on sharp turns, a sprint lean and a stronger run bob; the states are exposed for character animation later.

**Your choice of life** — every story dialogue can be declined with "Not now — I go find another hustle". The story pauses, the objective card points you to jobs, courses, the gym and business, and the mission resumes when you return to the contact or call them from the phone.

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

**Playable core (0.8)** — smoother on-foot acceleration and turning with a walk bob; third-person camera with mouse orbit, wheel zoom, pinch-to-zoom and one-finger drag on touch, and occlusion against buildings; collisions against buildings, fences, poles, palms, parked and moving vehicles; a location indicator under the clock that names the street or landmark you are on.

**Performance** — lane markings, fences, street-light poles, panels and lamp heads, palm trunks and leaves are merged into one mesh each; the shadow frustum follows the player at 2048 instead of covering the district at 4096; no per-frame allocations in movement and camera; GPS re-routes four times a second and the minimap redraws every other frame. Touch devices and small screens get a low-end profile: pixel ratio 1.5, no antialiasing, shadows off by default, fewer pedestrians, vehicles and raindrops, and no blur behind HUD panels.

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
- Saves from Alpha 0.5 to 0.8 migrate automatically.
- Append `#debug` to the URL to expose `window.__nr` for manual testing.
