# NAIJA RISE — Lagos · Unity edition (vertical slice)

A Unity 6 project that builds the same Lagos as the Three.js game (`../src`) from the same district data. It is the
"native-engine vertical slice" that `../PLAN.md` (Multi-Platform Technical Roadmap, §2) asks for before any decision
to migrate: it exists to be measured against the web edition, not to replace it yet.

Unity 6000.6.5f1 · Universal Render Pipeline 17.6 · legacy Input Manager · no other packages.

## What is here

- **Shared map and data.** `npm run export:unity` (repo root) runs `scripts/export-world.mjs`, which imports the engine's
  data modules and writes `Assets/NaijaRise/Resources/world/lagos.json`: 85 roads with class, width, extent and named
  segments, the 4 bridge decks, 171 junctions, 120 landmarks (the family compound included), 52 bus stops, 4
  properties, water bodies, tolls, footbridges, U-turns, kiosks, vendors, corridor compound cells, plus the 18 jobs,
  32 placed contacts, 17 vehicle classes, wardrobe fabrics and skin tones, level titles and unlocks. The Unity side
  never hard-codes the city, so a new district or job is still a data file.
- **Coordinates.** Unity is left-handed, so the data's +z south is mapped to Unity -z in one place
  (`WorldData.W` / `WorldData.DataZ`). North is +z in the scene, Lagos Island is east (+x) of Surulere, and
  right-hand traffic is on the physical right. Every query takes Unity world positions unless its name ends in `Data`.
- **WorldBuilder** (`Scripts/World/WorldBuilder.cs`). Ground, lagoon and creek water, carriageways with pavements,
  medians or centre lines and street lights (gaps at junctions), bridge decks that follow the real height profiles
  with barriers and pillars, landmarks with lit sign boards, market stalls, bus-stop shelters, the four rentable
  properties, corridor towers and compounds, region-aware procedural housing, the Lekki toll plaza, pedestrian
  footbridges, POS kiosks and roadside vendors. About 6,000 static objects, batched; the city builds in about a second.
- **Look** (`Scripts/World/PostFx.cs`, `Scripts/World/DayNightCycle.cs`). URP with an HDR frame, soft bloom that shows on
  street lights at night, a neutral grade, ACES tone mapping, FXAA and a light vignette. One game hour per 45 s, new game
  at 08:30, warm low sun, moonlit night, ambient and fog that follow, lamps that glow after dark.
- **Player, camera, driving** (`Scripts/Player/`, `Scripts/Vehicles/`). CharacterController with camera-relative
  movement, ease-in acceleration, sprint that burns stamina, jump and gravity. Third-person camera with lag, eased
  look-at, mouse / Z-C orbit, occlusion pull-in, wider FOV at speed, and a longer frame that swings in behind a vehicle.
  The arcade driving model is ported from `src/systems/movement.js`: class max / boost / acceleration, braking, slow
  reverse, handbrake, steering that firms up with speed and loosens as condition drops; crashes cost speed and condition.
  Three starter vehicles (sedan, danfo, keke) are parked by the spawn; any stopped traffic vehicle can be taken (Heat +1).
- **People** (`Scripts/World/ContactSystem.cs`, `PedestrianSystem.cs`, `Scripts/Entities/Mannequin.cs`). The 32 story and
  job contacts stand outside their places with name labels and turn to face you. Seventy pedestrians in wardrobe
  fabrics walk the pavements near you, turn back at bridges and water, and are recycled when far away. Everyone is a
  primitive mannequin until rigged characters arrive.
- **Session** (`Scripts/Session.cs`, `Scripts/GameState.cs`). Prompts (TALK TO BABA K, ENTER DANFO, TAKE KEKE, BUY PURE
  WATER, EXIT VEHICLE), dialogue cards with each contact's line, job shifts that compress `dur` game hours into a few
  seconds and pay wages with the +1 %-per-skill-point bonus, XP and levels with the web edition's titles and unlocks,
  skills (driving trains while you drive, fitness while you sprint), heat that decays, fuel, stamina, and a JSON save
  under `Application.persistentDataPath` written every 15 s and on quit; the game resumes where you left it.
- **Traffic** (`Scripts/World/TrafficSystem.cs`). 110 danfos, kekes, koropes, okadas, cars, police, LAWMA and tanker
  trucks in lanes on the right, keeping distance, braking for you, slowing at rush hour on bridges and highways.
- **HUD** (`Scripts/UI/`). Brand, district and street or bridge top-left; clock, day and heat top-right; a north-up minimap
  bottom-left; cash, RiseBank, level, XP bar and speed / fuel / condition bottom-right; health and stamina bars with the
  prompt bottom-centre; toasts, dialogue and shift overlays.
- **Editor tools** (`Editor/`). Menu `NAIJA RISE ▸ Create Lagos Scene`, `Smoke Test World Build`, `Run Play Test`,
  `Build macOS Player`, `Build WebGL Player`; all run headless too (below).

Everything is created from code at startup by `GameBootstrap` in `Assets/NaijaRise/Scenes/Lagos.unity`; the scene
itself only holds a camera, a sun and that one component. Pipeline assets in `Assets/Settings` come from the editor's
own `urp-blank` template.

## Run it

Open `unity/` in Unity Hub (editor 6000.6.5f1), open `Assets/NaijaRise/Scenes/Lagos.unity` and press Play.

| Input | On foot | Driving |
|---|---|---|
| WASD / left stick | move | gas, brake / reverse, steer |
| Shift | sprint | boost |
| Space | jump | handbrake |
| E | talk, enter, take, buy | exit (when stopped) |
| X | decline dialogue | |
| Mouse, Z / C | look | look |
| Esc | free the cursor | |

Headless, from the repo root:

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.6.5f1/Unity.app/Contents/MacOS/Unity"
npm run export:unity                                   # refresh the data after editing src/data
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.SmokeTest -logFile -
"$UNITY" -batchmode       -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.PlayTest.Run        -logFile -
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.BuildMac   -logFile -
open unity/Builds/NaijaRise-Lagos.app
```

The smoke test builds the whole city in edit mode and checks object counts, that every job and contact resolves to a
place, the spawn region and street, the Eko Bridge deck height and the coordinate mirror. The play test enters play
mode, boots the game, walks to Baba K, works a shift, drives the parked sedan, exits, saves and reloads, and exits the
editor with 0 on success (no `-quit`: it quits itself). Both are CI-ready.

## What is deliberately not here yet

This is the slice, not the port. Missing against the web Alpha 1.0:

- Rigged characters and wardrobe prints (everyone is a mannequin; the Ready Player Me / Mixamo rigs need a glTF importer,
  see below), animals, uniforms, agberos and the service NPCs.
- Vehicle ownership, Dayo's dealership, servicing and liveries; LASTMA, police chases, roadblocks and arrest; traffic
  lights, go-slow incidents, tolls charging, danfo transit.
- Most of `src/systems/`: businesses, housing, education, family, relationships, missions and story, racing, the phone
  apps, weather. These are plain JavaScript game rules that port mechanically to C#, and their data files export the
  same way as jobs and contacts do now.
- The Kenney vehicle models, landmark GLBs and vegetation under `../assets/`. Unity 6 does not import `.glb` out of the
  box: add `com.unity.cloud.gltfast` to `Packages/manifest.json`, and the Meshopt-compressed files need decompressing
  first (they were compressed for the web build).
- Graphics quality profiles and dynamic resolution (URP's render scale is the hook), environment reflections, rain.
- Water is walkable (a flat plane with a collider); a swim / blocker layer is a TODO. Pedestrians have no colliders.

## How to judge it (the roadmap's question)

Measure, then decide. Suggested checks against the web build on the same machine:

1. Frame time at the spawn and on Eko Bridge at 20:00 (lamps on, traffic in rush hour) — Unity Profiler vs the web
   build's dynamic-resolution step.
2. Time to add a district or a job: edit `src/data`, run `npm run export:unity`, press Play. Both editions should
   pick it up with zero code.
3. Controller feel on the same PlayStation pad (legacy Input Manager here; the Input System package is the upgrade path
   for native console mappings).
4. Build output: `Builds/NaijaRise-Lagos.app` size and startup time, and a WebGL build for parity with the Vercel
   deployment.

If Unity wins on 1 and 3, the port order is: remaining systems and data export → vehicles, police and heat →
characters via glTFast → quality profiles → console input. If it does not, the slice has still produced a JSON export
of the whole game data that other tools can use.
