# Rise: Hustle or Die Trying · Unity

Unity 6 project that builds Lagos from the shared data files in `../src/data`.

Unity 6000.6.5f1 · Universal Render Pipeline 17.6 · Input System 1.19 · glTFast 6.0.1 with the Meshopt decoder.

## Status

| Area | State |
|---|---|
| Compile | clean, no warnings |
| Smoke test (edit mode) | passes: 85 roads, 120 landmarks, ~7,000 objects in under a second; every job and contact resolves; coordinate mirror verified |
| Play test (play mode) | passes all checks across the full gameplay loop (story, jobs, driving, housing, businesses, staff shifts, offline earnings, 3D interiors, protection weapon, phone Map · GPS, weather, events, multiplayer, crews, co-op race) |
| macOS build | `Builds/Rise-Lagos.app`, universal binary with stadium, tree, character, animal, and vehicle models |
| WebGL build | `Builds/WebGL`, gzip-compressed with touch controls for mobile browsers |
| Vehicles | 17 classes, all GLB models (15 Kenney + 10 Lagos models: danfo, keke, korope, okada, BRT, army, tanker, pickup, motorcycles) |
| Mobile | `TouchControls`: floating joystick, drag-to-look, ACT / FIGHT / ITEM / JUMP / RUN / BRAKE / PHONE buttons, tappable menus |

## Controls

| Action | Keyboard + Mouse | Gamepad | Mobile Touch |
|---|---|---|---|
| Move / Steer | `WASD` or Arrow keys | Left Stick | Left-half floating joystick |
| Look / Orbit Camera | Mouse (locked) or `Z` / `C` | Right Stick | Drag on right half |
| Sprint (foot) / Boost (car) | `Shift` | West (`Square` / `X`) | `RUN` / `BOOST` |
| Jump (foot) / Handbrake (car) | `Space` | North (`Triangle` / `Y`) / East (`Circle` / `B`) | `JUMP` / `BRAKE` |
| Interact / Enter Vehicle / Talk | `E` | South (`Cross` / `A`) | `ACT` |
| Fight / Melee Attack | `F` or `Left Click` (locked) | Right Shoulder (`R1` / `RB`) | `FIGHT` |
| Pick Up Street Item | `G` (or `E` on ground item) | D-Pad Down | `ITEM` / `ACT` |
| Switch / Holster Fight Weapon | `Q` | Left Shoulder (`L1` / `LB`) | `ITEM` |
| Decline / Close Menu | `X` or `Backspace` | East (`Circle` / `B`) | `X` |
| Open Smartphone | `P` or `Tab` | `Select` / `View` | `PHONE` |
| District Chat | `T` or `Enter` | D-Pad Up | — |
| Free Cursor / Pause Menu | `Esc` | `Start` / `Options` | — |

## Architecture

**Shared data.** `npm run export:unity` (repo root) runs `scripts/export-world.mjs`, which imports `src/data` modules and writes `Assets/Rise/Resources/world/lagos.json`: the merged district map (roads with class, width, extent and named segments, bridge decks, junctions, landmarks, bus stops, properties, water, tolls, footbridges, kiosks, vendors, compound cells), 18 jobs, 64 placed contacts (including 17 district hubs and 32 Surulere street contacts), 17 vehicle classes, 4 businesses, Dayo's price list, wardrobe fabrics and skin tones, level titles and unlocks, place-activity prices, café courses, and law/economy rules. Story missions live in `Scripts/Story/Story.cs`.

**Coordinates.** Unity is left-handed, so the data's +z south is mapped to Unity -z in one place (`WorldData.W` / `WorldData.DataZ`). North is +z in the scene, Lagos Island is east of Surulere, and right-hand traffic is on the physical right. Every query takes Unity world positions unless its name ends in `Data`.

**City** (`Scripts/World/WorldBuilder.cs`). Ground, lagoon and creek, carriageways with pavements, medians or centre lines and street lights (gaps at junctions), bridge decks on their real height profiles with barriers and pillars, landmarks with lit sign boards, Murtala Muhammed Airport (terminal, control tower, runway, aircraft), Makoko stilt huts and canoes, football pitches with goalposts and floodlights, market stalls, bus-stop shelters, rentable properties, businesses, corridor towers and compounds, region-aware procedural housing (with rooftop water tanks, AC units, balconies, and generators), the Lekki toll plaza, footbridges, POS kiosks, roadside vendors, the National Stadium and Teslim Balogun Stadium models, and tropical/maple/pine trees. Static and batched.

**Look** (`Scripts/World/PostFx.cs`, `DayNightCycle.cs`, `QualityGovernor.cs`). URP with an HDR frame, soft bloom on street lights at night, a neutral grade, ACES tone mapping, FXAA and a light vignette. One game hour per 45 s, starting at 08:30, warm low sun, moonlit night, lamps glowing after dark. `QualityGovernor` auto-detects the GPU (High, Medium, Low), steps down a level whenever frames stay slow, and adjusts dynamic resolution in four steps with hysteresis. A realtime reflection probe follows the player and re-renders each game hour so car paint and wet night asphalt reflect the sky and lamps.

**Player, camera, driving** (`Scripts/Player/`, `Scripts/Vehicles/`). CharacterController movement with ease-in acceleration, sprint that burns stamina, and jump. Third-person camera with lag, eased look-at, mouse / right-stick / Z-C orbit, occlusion pull-in, wider FOV at speed, and smooth vehicle follow. All 17 vehicle classes load GLB models (`Resources/Models/Vehicles`) scaled to class length with spinning wheels. You start with one keke; Dayo at Ladipo sells okada, keke, korope, danfo, and sedan, services damaged vehicles, sells insurance, applies liveries and danfo slogans, and sells a protection weapon (`₦18,000`). Stopped private traffic vehicles can be taken for Heat +1; commercial vehicles require a protection weapon and trigger crew retaliation. Walking into the lagoon switches to swimming (draining stamina and health in deep water before fishermen rescue you to shore); driving into the lagoon stalls and sinks the vehicle.

**People** (`Scripts/Entities/CharacterRig.cs`, `Fabrics.cs`, `Scripts/World/ContactSystem.cs`, `PedestrianSystem.cs`). The player, 64 contacts, and 70 pedestrians use the Ready Player Me avatar (70%) and Khronos CesiumMan (30%), imported with glTFast and driven by legacy `Animation` clips (`Editor/CharacterImport.cs` rebinds Idle / Walk / Run onto the avatar skeleton). Clothing wears procedural Nigerian fabric prints (`Fabrics.cs`: ankara, adire, aso-oke, lace, Super Eagles jersey, plain) across all 11 look slots (skin, face, body type, hair style, hair colour, facial hair, outfit, fabric, trousers, shoes, accessory). Pedestrians follow role-based daily pace schedules (`trader`, `office`, `youth`, `wander`).

**Story and GPS** (`Scripts/Story/Story.cs`, `Scripts/Session.Story.cs`, `Scripts/World/Navigation.cs`). The shared prologue (The First Run, Make the Delivery, Get Paid, Raise Your Game, Hot Delivery), the Crossroads fork by reputation, Amaka's legit arc (Cold Chain timed delivery, Warehouse Run under 90 km/h, The Iponri Race) and Baba K's risk arc (Vehicle Recovery, Getaway, Rival Operation). Every dialogue can be declined with "Not now — I go find another hustle". The GPS line routes along the road grid (junction graph plus Dijkstra) to active mission targets, custom waypoints set from the `Map · GPS` phone app, or shared crew pins.

**Life & Places** (`Scripts/Session*.cs`, `Scripts/GameState.cs`). Contacts offer jobs; shifts compress `dur` game hours into a few seconds and pay wages with skill bonuses, XP, and level titles. Agent Kunle rents properties (30-day lease, 10% fee) or sells them from Level 2; extra owned homes can be let to tenants, upgraded (generator, water tank, security), and repaired when tenants complain. Businesses are bought from Level 2, stocked, price-tuned, and staffed with up to three employees whose shifts cycle through `morning`, `afternoon`, `night`, and `all-day`. While you are away, businesses and tenants earn into RiseBank (`ApplyAwayEarnings`, capped at 8 hours). Danfos run between bus stops for a standard fare or a negotiated 70% fare with the conductor. Places include the gym, restaurants, mall (outfits, supermarket groceries, laptop, barber, cinema), cyber café courses, Community Grammar School, Yaba Tech diploma, street football tiers, RiseBank branches, nightlife clubs/bars, Saturday Owambe spraying, church/mosque prayer, Rita Lori Hotel, Area C Police Station, PHCN generator diesel payments, POS kiosks (pure water, suya, ₦20,000 cash withdrawal), roadside vendors, and enterable 3D interiors for homes, shops, and offices.

**Law** (`Scripts/World/Law.cs`, `TrafficLights.cs`). Traffic lights at every lit junction on a 28-second cycle; running a red near LASTMA costs ₦5,000 or heat. FRSC speeding tickets, army checkpoints, and pedestrian hits. Heat 3+ spawns pursuing police cars with flashing light bars; caught, you can bribe (60% chance) or be booked at Area C. Heat 4+ spawns army roadblocks; standing at your own gate for 10 seconds while wanted drops heat to 2.

**Phone** (`Scripts/Session.Phone.cs`). P, Tab, or Gamepad Select opens the smartphone with 12 apps: Messages, Jobs, RiseBank, Property, Businesses (with direct management), Character (skills, reputation, certificates, 11-slot look editor), Contacts, Inventory, Crew, Account, Settings (graphics quality, cinematic look, sound toggle, mature content toggle, save now, new game), and `Map · GPS` (search and filter landmarks, bus stops, properties, and contacts to set or clear a GPS waypoint).

**Audio** (`Scripts/UI/SoundSystem.cs`). Procedural synthesised audio with zero external audio files: engine hum pitched to vehicle speed, rain loop, generator drone during NEPA outages, crash horn, and cash chime on transactions.

**Accounts, cloud save, multiplayer & crews** (`Scripts/Net/`, `Scripts/Session.Crew.cs`). Supabase Auth accounts, cloud save sync (`supabase/schema.sql`), district Realtime rooms syncing player position/vehicle/look at 10 Hz with district chat, and crews with shared treasury, HQ, GPS pins, and co-op racing (with an automatic in-process loopback fallback when offline).

## Run It

Open `unity/` in Unity Hub (editor 6000.6.5f1), open `Assets/Rise/Scenes/Lagos.unity` and press Play.

### Headless CLI

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.6.5f1/Unity.app/Contents/MacOS/Unity"
npm run export:unity                                   # refresh lagos.json after editing src/data
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.SmokeTest -logFile -
"$UNITY" -batchmode       -nographics -projectPath unity -executeMethod Rise.EditorTools.PlayTest.Run        -logFile -
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.BuildMac   -logFile -
open unity/Builds/Rise-Lagos.app
```
