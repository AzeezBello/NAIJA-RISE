# NAIJA RISE — Lagos · Unity edition

A Unity 6 project that builds the same Lagos as the Three.js game in `../src`, from the same data files. It started on
13 October 2026 as the "native-engine vertical slice" that `../PLAN.md` (Multi-Platform Technical Roadmap, §2) asks for
before any decision to migrate, and has grown in five increments into a playable slice of the game: city, driving,
people, story, law, housing, business, education and racing. The web edition remains the production baseline.

Unity 6000.6.5f1 · Universal Render Pipeline 17.6 · Input System 1.19 · no other packages.

## Status

| Area | State |
|---|---|
| Compile | clean, no warnings |
| Smoke test (edit mode) | passes: 85 roads, 120 landmarks, about 6,000 objects in under a second; every job and contact resolves; mirror correct |
| Play test (play mode) | passes, 47 checks across the whole loop, see "Headless" below |
| macOS build | `Builds/NaijaRise-Lagos.app`, about 73 MB |
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
roadside vendors. Static and batched.

**Look** (`Scripts/World/PostFx.cs`, `DayNightCycle.cs`). URP with an HDR frame, soft bloom that shows on street lights
at night, a neutral grade, ACES tone mapping, FXAA and a light vignette. One game hour per 45 s, a new game starts at
08:30, warm low sun, moonlit night, ambient and fog follow, lamps glow after dark.

**Player, camera, driving** (`Scripts/Player/`, `Scripts/Vehicles/`). CharacterController movement with ease-in
acceleration, sprint that burns stamina, jump. Third-person camera with lag, eased look-at, mouse / right-stick / Z-C
orbit, occlusion pull-in, wider FOV at speed, and a longer frame that swings in behind a vehicle. The arcade driving
model is ported from `src/systems/movement.js`; crashes are judged by contact normal (ground contacts never count) and
cost speed and condition. You start with one keke; Dayo at Ladipo sells okada, keke, korope, danfo and sedan at the web
prices and services vehicles parked nearby. Owned vehicles persist where you parked them. Refuel at Mobil. Any stopped
traffic vehicle can be taken for Heat +1.

**People** (`Scripts/World/ContactSystem.cs`, `PedestrianSystem.cs`, `Scripts/Entities/Mannequin.cs`). The 32 story and
job contacts stand outside their places with name labels and turn to face you; the current objective's contact carries
a bobbing yellow arrow. Seventy pedestrians in wardrobe fabrics walk the pavements near you. Everyone is a primitive
mannequin until rigged characters arrive.

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

The smoke test builds the whole city in edit mode and checks object counts, that every job and contact resolves to a
place, the spawn region and street, the Eko Bridge deck height and the coordinate mirror. The play test enters play
mode, boots the game and plays through the loop: The First Run with Baba K (taking the clean path), a shift, buying a
sedan from Dayo and driving it, renting a room and sleeping, buying the kiosk and collecting a pay cycle, a danfo ride,
pursuit and arrest at Heat 3, delivering the documents to Amaka, the Cold Chain task along the GPS, learning web design
and unlocking Web Freelancer, cardio at the gym, jollof, a race against Speedy, then save and reload. It exits the editor
with 0 on success (no `-quit`: it quits itself). Both are CI-ready.

## Not here yet

- Rigged characters, wardrobe prints and animation (everyone is a mannequin). Unity 6 does not import `.glb` out of the
  box: add `com.unity.cloud.gltfast` to `Packages/manifest.json`, and the Meshopt-compressed files under `../assets`
  need decompressing first (they were compressed for the web build). Same for the Kenney vehicles and landmark models.
- Yaba Tech and the school evening class; family and relationships; the phone and its apps; weather; the AJ City
  errand and the hustle-hub side missions; the football tournament tiers.
- Insurance, liveries and danfo slogans; go-slow incidents and road-construction diversions; tenants and property
  upgrades; business staff, shifts and the rival trader; animals, uniforms and agberos.
- Graphics quality profiles and dynamic resolution (URP's render scale is the hook), environment reflections.
- Water is walkable (a flat plane with a collider). Pedestrians have no colliders.

## How to judge it (the roadmap's question)

Measure, then decide. Suggested checks against the web build on the same machine:

1. Frame time at the spawn and on Eko Bridge at 20:00 (lamps on, traffic in rush hour): Unity Profiler vs the web
   build's dynamic-resolution step.
2. Time to add a district, a job or a course: edit `src/data`, run `npm run export:unity`, press Play. Both editions
   should pick it up with zero code.
3. Controller feel on the same PlayStation pad; the Input System's action maps are the path to native console bindings.
4. Build output: the macOS app's size and startup time, and a WebGL build for parity with the Vercel deployment.

If Unity wins on 1 and 3, the remaining port is: characters via glTFast, the phone, family and education extras,
quality profiles, console action maps. If it does not, the slice has still produced a JSON export of the whole game
data that other tools can use.
