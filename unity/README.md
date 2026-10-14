# NAIJA RISE — Lagos · Unity edition

A Unity 6 project that builds the same Lagos as the Three.js game in `../src`, from the same data files. It started on
13 October 2026 as the "native-engine vertical slice" that `../PLAN.md` (Multi-Platform Technical Roadmap, §2) asks for
before any decision to migrate, and has grown in five increments into a playable slice of the game: city, driving,
people, story, law, housing, business, education and racing. The web edition remains the production baseline.

Unity 6000.6.5f1 · Universal Render Pipeline 17.6 · Input System 1.19 · glTFast 6.0.1 with the Meshopt decoder.

## Status

| Area | State |
|---|---|
| Compile | clean, no warnings |
| Smoke test (edit mode) | passes: 85 roads, 120 landmarks, about 6,000 objects in under a second; every job and contact resolves; mirror correct |
| Play test (play mode) | passes, 90 checks across the whole loop, see "Headless" below |
| macOS build | `Builds/NaijaRise-Lagos.app`, about 350 MB with the stadium, tree, character and animal models |
| WebGL build | menu item exists, not yet exercised |
| Open in editor | no errors; the serialization and deprecation analyzers are quiet |

## What is here

**Shared data.** `npm run export:unity` (repo root) runs `scripts/export-world.mjs`, which imports the engine's data
modules and writes `Assets/NaijaRise/Resources/world/lagos.json`: the merged district map (roads with class, width,
extent and named segments, the four bridge decks, junctions, landmarks, bus stops, properties, water, tolls,
footbridges, kiosks, vendors, compound cells), the 18 jobs, 32 placed contacts, 17 vehicle classes, the 4 businesses,
Dayo's price list, wardrobe fabrics and skin tones, level titles and unlocks, place-activity prices, café courses and
the law and economy rules. The Unity side never hard-codes the city, so a new district, job or course is still a data
file. The story missions are the one hand-ported piece (`Scripts/Story/Story.cs`), because they are code in the web
edition.

**Coordinates.** Unity is left-handed, so the data's +z south is mapped to Unity -z in one place
(`WorldData.W` / `WorldData.DataZ`). North is +z in the scene, Lagos Island is east of Surulere, and right-hand traffic
is on the physical right. Every query takes Unity world positions unless its name ends in `Data`.

**City** (`Scripts/World/WorldBuilder.cs`). Ground, lagoon and creek, carriageways with pavements, medians or centre
lines and street lights (gaps at junctions), bridge decks on their real height profiles with barriers and pillars,
landmarks with lit sign boards, market stalls, bus-stop shelters, the four rentable properties, the four businesses,
corridor towers and compounds, region-aware procedural housing, the Lekki toll plaza, footbridges, POS kiosks and
roadside vendors. The National Stadium is the web edition's stadium model fitted to its footprint, and about thirty
trees (tropical, maple, pine, height-fitted with jitter) stand in the Surulere plots and along the Eko Atlantic shore,
kept off the road shoulders. Static and batched.

**Look** (`Scripts/World/PostFx.cs`, `DayNightCycle.cs`, `QualityGovernor.cs`). URP with an HDR frame, soft bloom that
shows on street lights at night, a neutral grade, ACES tone mapping, FXAA and a light vignette. One game hour per 45 s,
a new game starts at 08:30, warm low sun, moonlit night, ambient and fog follow, lamps glow after dark. Graphics
compatibility follows `core/quality.js`: Auto reads the GPU (Apple M-series, NVIDIA and AMD start High, Intel and unknown
Medium, software or low-memory devices Low) and steps down a level whenever frames stay slow; dynamic resolution moves
URP's render scale through four steps with hysteresis, climbs back after sustained fast frames (waiting twice as long
after each failed recovery), and stops shrinking when it buys nothing. Low turns off shadows and the cinematic pass. A
realtime reflection probe follows the player and re-renders each game hour, so car paint and wet night asphalt (the
roads turn glossy in the rain) carry the sky and the lamps.

**Player, camera, driving** (`Scripts/Player/`, `Scripts/Vehicles/`). CharacterController movement with ease-in
acceleration, sprint that burns stamina, jump. Third-person camera with lag, eased look-at, mouse / right-stick / Z-C
orbit, occlusion pull-in, wider FOV at speed, and a longer frame that swings in behind a vehicle. Cars, police, LAWMA, fire, ambulance, van, delivery and truck classes use Kenney's CC0 Car Kit
models (`Resources/Models/Vehicles`, Meshopt-compressed, decoded on import), scaled to the class length with their
named wheels spinning; danfo, keke, korope, okada, BRT and the tanker stay procedural, as in the web edition. The arcade driving
model is ported from `src/systems/movement.js`; crashes are judged by contact normal (ground contacts never count) and
cost speed and condition. You start with one keke; Dayo at Ladipo sells okada, keke, korope, danfo and sedan at the web
prices and services vehicles parked nearby. Owned vehicles persist where you parked them. Refuel at Mobil. Any stopped
traffic vehicle can be taken for Heat +1. Walk into the lagoon and you swim (slow, no sprint or jump, body in the
water); drive into it and the engine dies, the vehicle settles and you swim out. Pedestrians have bodies you bump into.

**People** (`Scripts/Entities/CharacterRig.cs`, `Fabrics.cs`, `Scripts/World/ContactSystem.cs`, `PedestrianSystem.cs`).
The player, the 32 contacts and the 70 pedestrians are real humans: the Ready Player Me avatar the web edition streams
(rig 0, 70 % of the street) and Khronos' CesiumMan (30 %), imported with glTFast and driven by legacy `Animation`
clips. The Ready Player Me Idle / Walk / Run clips ship as separate GLBs whose curves point at a different root, so
`Editor/CharacterImport.cs` rebinds every curve by bone name onto the avatar and saves `Resources/Characters/*.anim`;
it runs before the smoke test and every build. Clothing wears the procedural Nigerian fabric prints from `wardrobe.js`
(ankara, adire, aso-oke, lace, Super Eagles jersey, plain) drawn as 128-pixel tiles onto the outfit material; trousers,
skin, hair and cap are tinted per look, and the street draws random looks so no two pedestrians match. The player's look
is saved; the mall's outfit cycles the fabric and the barber the hair colour. Walk and run clips scale to movement speed
and cross-fade from the controller state; CesiumMan freezes when idle, as in `character.js`. The mannequin remains the
fallback when the assets are missing.

**Story and GPS** (`Scripts/Story/Story.cs`, `Scripts/Session.Story.cs`, `Scripts/World/Navigation.cs`). The shared
prologue (The First Run, Make the Delivery, Get Paid, Raise Your Game, Hot Delivery and its police-chased drop), the
Crossroads fork by reputation, Amaka's legit arc (Cold Chain timed delivery, Warehouse Run under 90 km/h, The Iponri
Race) and Baba K's risk arc (Vehicle Recovery, Getaway, Rival Operation). Every dialogue can be declined with "Not now —
I go find another hustle", which pauses the story. The objective card shows the mission, the live objective and the
route distance; a marker sits on the target and the GPS line routes along the road grid (junction graph plus Dijkstra,
as in `navigation.js`). Arrest fails deliveries, recoveries and escapes. Reputation and inventory are tracked and saved.

**Life** (`Scripts/Session*.cs`, `Scripts/GameState.cs`). Prompts open a generic choice card (W/S or stick, E, X, or the
option number). Contacts offer their jobs; shifts compress `dur` game hours into a few seconds and pay wages with the
+1 %-per-skill-point bonus, XP and levels with the web titles and unlocks. Agent Kunle rents the properties (30-day
lease, 10 % fee) or sells them from Level 2; sleeping at home jumps to 07:00, restores you and clears heat per the
home's perk; leases expire with a warning. Businesses are bought from Level 2 (the kiosk at 40 % off after Baba K's
introduction) and pay into RiseBank every pay cycle while stock drains. Danfos run between bus stops for a fare that
advances the clock. The Lekki toll charges ₦1,200 or notes your plate. The gym (membership, strength, cardio, trainer,
boxing), restaurants (meals, business lunch), the mall (outfits, laptop, barber) and cinema, the cyber café's five
courses whose certificates unlock the gated jobs, freelance gigs, and street football with Captain Tunde. Speedy races
two laps on Funsho Williams for a ₦20,000 wager. A JSON save under `Application.persistentDataPath` is written every
15 s and on quit; the game resumes where you left it.

**Law** (`Scripts/World/Law.cs`, `TrafficLights.cs`). Traffic lights at every lit junction on the shared 28-second cycle;
traffic stops on red, and running one in sight of the LASTMA post costs ₦5,000 or heat. FRSC speeding tickets, the army
checkpoint, pedestrian hits. At Heat 3 two police cars give chase with flashing light bars; caught, you settle
(heat × ₦5,000, 60 % works) or are booked at Area C (heat × ₦15,000). Heat 4 drops army roadblocks; ten seconds at
your own gate while wanted drops heat to 2.

**Phone** (`Scripts/Session.Phone.cs`). P, Tab or the pad's Select opens the smartphone from `ui/phone.js` as pages of
the choice card: Messages, Jobs (every job with its pay and what still locks it), RiseBank (deposits and withdrawals),
Property and Businesses (from Level 2), Character (skills, reputation, certificates, and the look editor: fabric, skin
tone, trousers, hair colour, cap; face, body type, hair style and facial hair are stored for the rig that will show
them), Contacts, Inventory and Settings (three graphics levels through URP's render scale and shadow range, the
cinematic look on or off, save now, new game).

**Hubs, schools, football** (`Scripts/Session.Hustle.cs`). The twelve district hustle hubs from `places.js` (Egbon
Adugbo in Surulere, the Ikoyi merchant, the Lekki keeper, the Ikorodu trader, Oga Chidi at Computer Village, the
Osoanya commission agents of Balogun, Yaba and Computer Village, Sisi Kemi in AJ City, Mama Sade at Makoko, Aunty
Bisi at the Shrine, Tayo at Kalakuta) offer repeatable timed deliveries along the GPS that pay cash, reputation and
XP. Community Grammar School runs the evening adult class; Yaba Tech enrols you in the Computer Systems diploma, three
paid semesters that graduate into the IT Support Technician job. Street football with Captain Tunde now climbs the three
tiers: quick match on a wager, the neighbourhood tournament after three wins, the Lagos championship.

**Weather and animals** (`Scripts/World/Weather.cs`, `AnimalSystem.cs`). A 15 % chance every minute of two to five
minutes of rain: a particle curtain around the camera, darker light, wet roads that cut grip, braking and steering to
70 % (as `movement.js` does), a storm variant, and harmattan haze on days 7 to 9 of every ten. Goats around the
markets, chickens by the compounds, stray cats, and two stray dogs on the rigged dog model with its walk and idle clips,
all wandering their patch.

**Family and relationships** (`Scripts/Session.Family.cs`, `Session.Relations.cs`). Mama Tunde and Chioma follow
their day plans from `family.js` between the compound yard and door, the market edge and the school gate. Household
needs drift down each day and raise requests (chop money, a visit, suya or sachet water from a kiosk, the school levy);
completing them restores the need, bonds the family (Strained to Unshakable) and pays XP and social reputation. Every
contact carries trust and respect, moved by one greeting and one work chat a day, with tiers stranger, known, friend and
close that change the greeting line and the tips they give; the Contacts app shows them.

**The street** (`Scripts/World/StreetLife.cs`, `Events.cs`, `Session.Street.cs`). Agberos work every bus stop and
demand ₦500 as you pass (pay, or refuse and risk heat); Mama Nkechi sells the dog that follows you and keeps them off,
and a home with the security upgrade does the same. Fifteen uniformed officers stand at their posts (police, army, fire,
LAWMA, LASTMA, VIO, KAI, Civil Defence, FRSC). Night hustlers appear outside the clubs after 20:00 when the mature toggle
in Settings is on, with the hookup and its pickpocket risk. The owambe crowd gathers at the event centre from 19:00.
City events run as in `events.js`: go-slow jams that traffic crawls through, road works that close a lane with cones,
barriers and a DIVERSION sign, an overturned keke with its cones, the storm flood at the Ojuelegba underpass that halves
your grip, and NEPA outages that take the street lights at night.

**Property, business and vehicles, the long game.** Owned homes you do not live in can be let to tenants who pay a
thirtieth of the rent each morning; tenants raise complaints that halve the rent until you pay for the repair. Homes
take the generator, water tank (stamina recovers 25 % faster) and security upgrades. Businesses hire up to three named
staff at ₦50,000 each for 30 % more income, and once you own two, Chidi's Corner opens and undercuts anyone not on low
prices. Dayo services each owned vehicle by condition (half price when insured), insures it at 8 % of its price (half
crash damage), repaints it in one of seven liveries and paints a slogan on danfos and koropes.

**The look on the rig** (`Scripts/Entities/CharacterRig.cs`). All eleven slots now show: fabric print, skin tone,
trousers, hair colour, body type (Slim, Average, Big widen or narrow the rig), hair style (Bald hides the hair, Afro
puffs it), facial hair (the beard renderer), accessory (fila or face cap on the headwear, glasses on the head bone, a
gold chain at the neck) and the outfit silhouette (senator kaftan, agbada, gown, skirt and buba as fabric-printed
overlays on the hips bone). Face shape is stored; the avatar has one face. The HUD carries a live portrait rendered from
a camera on the player's head.

**Traffic** (`Scripts/World/TrafficSystem.cs`). 110 danfos, kekes, koropes, okadas, cars, police, LAWMA and tanker
trucks in lanes on the right, keeping distance, braking for you, slowing at rush hour on bridges and highways.

**HUD** (`Scripts/UI/`). Brand, district and street or bridge top-left; clock, day and heat top-right; the objective
card and a north-up minimap bottom-left; cash, RiseBank, level, XP, reputation and speed / fuel / condition
bottom-right; health and stamina bars with the prompt bottom-centre; toasts, menus, shift overlay, wanted banner.

Everything is created from code at startup by `GameBootstrap` in `Assets/NaijaRise/Scenes/Lagos.unity`; the scene
only holds a camera, a sun and that one component. Pipeline assets in `Assets/Settings` come from the editor's own
`urp-blank` template.

## Run it

Open `unity/` in Unity Hub (editor 6000.6.5f1), open `Assets/NaijaRise/Scenes/Lagos.unity` and press Play.

| Input | On foot | Driving |
|---|---|---|
| WASD / arrows, left stick | move | gas and brake (W/S), steer (A/D) |
| Right trigger / left trigger | | gas / brake |
| Shift, Square (X) | sprint | boost |
| Space, Triangle (Y) | jump | handbrake (Space, Circle) |
| E, Cross (A) | talk, enter, take, buy, deliver | exit, deliver, refuel (when stopped) |
| P, Tab, Select | phone | phone |
| X, Backspace, Circle (B) | close a menu | |
| 1–5 | pick a menu option | |
| Mouse, right stick, Z / C | look | look |
| Esc, Start | free or lock the cursor | |

Input goes through the Input System package (`Scripts/GameInput.cs`), polled directly from the keyboard, mouse and a
standard gamepad, so there is no actions asset to maintain; `activeInputHandler` is Input System only.

### Headless

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.6.5f1/Unity.app/Contents/MacOS/Unity"
npm run export:unity                                   # refresh the data after editing src/data
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.SmokeTest -logFile -
"$UNITY" -batchmode       -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.PlayTest.Run        -logFile -
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.BuildMac   -logFile -
open unity/Builds/NaijaRise-Lagos.app
```

The editor must be closed: Unity allows one instance per project. The same commands are in the editor under the
`NAIJA RISE` menu.

The smoke test prepares the character clips, builds the whole city in edit mode and checks object counts, that every
job and contact resolves to a place, the spawn region and street, the Eko Bridge deck height, the coordinate mirror,
the rigs (three legacy clips on the avatar with a fabric print applied, CesiumMan with its walk), the stadium model and
tree count, and a Kenney sedan scaled to its class length with four wheels. The play test enters play
mode, boots the game and plays through the loop: The First Run with Baba K (taking the clean path), a shift, buying a
sedan from Dayo and driving it, renting a room and sleeping, buying the kiosk and collecting a pay cycle, a danfo ride,
pursuit and arrest at Heat 3, delivering the documents to Amaka, the Cold Chain task along the GPS, learning web design
and unlocking Web Freelancer, cardio at the gym, jollof, a race against Speedy, the phone and a bank deposit, rain, the
Yaba Tech diploma unlocking IT Support, a Surulere hub delivery, three football wins opening the tournament, the
animals, a family request and bond, relationship tiers, the look slots on the rig, the agbero levy and the dog, tenants and a
repair, the water tank, hiring staff and the rival, insurance, livery and slogan, road works, a wreck and the flood, a swim in the
lagoon and a sunk sedan, the quality governor stepping down under slow frames, then save and reload. It exits the editor
with 0 on success (no `-quit`: it quits itself). Both are CI-ready.

## Not here yet

- Multiplayer, accounts and the server-side save (web Phases 5 and 6), which the Unity edition would share.
- Console action maps for the Input System and the platform builds themselves (the roadmap's P3 onwards).

## How to judge it (the roadmap's question)

Measure, then decide. Suggested checks against the web build on the same machine:

1. Frame time at the spawn and on Eko Bridge at 20:00 (lamps on, traffic in rush hour): Unity Profiler vs the web
   build's dynamic-resolution step.
2. Time to add a district, a job or a course: edit `src/data`, run `npm run export:unity`, press Play. Both editions
   should pick it up with zero code.
3. Controller feel on the same PlayStation pad; the Input System's action maps are the path to native console bindings.
4. Build output: the macOS app's size and startup time, and a WebGL build for parity with the Vercel deployment.

If Unity wins on 1 and 3, the remaining work is the roadmap's own: console action maps and platform builds, then the
multiplayer and account phases both editions share. If it does not, the slice has still produced a JSON export of the whole game
data that other tools can use.
