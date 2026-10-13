# NAIJA RISE — Lagos · Unity edition (vertical slice)

A Unity 6 project that builds the same Lagos as the Three.js game (`../src`) from the same district data. It is the
"native-engine vertical slice" that `../PLAN.md` (Multi-Platform Technical Roadmap, §2) asks for before any decision
to migrate: it exists to be measured against the web edition, not to replace it yet.

## What is here

- **Shared map.** `npm run export:unity` (repo root) runs `scripts/export-world.mjs`, which imports
  `src/data/districts/lagos.js` and writes `Assets/NaijaRise/Resources/world/lagos.json`: 85 roads with class, width,
  extent and named segments, the 4 bridge decks, 171 junctions, 119 landmarks, 52 bus stops, 4 properties, water
  bodies, tolls, footbridges, U-turns, kiosks, vendors and the corridor compound cells. The Unity side never hard-codes
  the city, so a new district is still a data file.
- **WorldBuilder** (`Scripts/World/WorldBuilder.cs`). Ground, lagoon and creek water, carriageways with pavements,
  medians or centre lines and street lights (with gaps at junctions), bridge decks that follow the real height profiles
  with barriers and pillars, landmarks with lit sign boards, market stalls, bus-stop shelters, the four rentable
  properties, corridor towers and compounds, region-aware procedural housing (towers on the Island and VI, duplexes in
  Lekki, bungalows and storey houses elsewhere), the Lekki toll plaza, pedestrian footbridges, POS kiosks and roadside
  vendors. About 6,000 static objects, batched; the whole city builds in under a second.
- **Player and camera** (`Scripts/Player/`). CharacterController with camera-relative movement, ease-in acceleration,
  sprint, jump and gravity, so kerbs and bridge ramps are walked for real. Third-person camera with lag, eased look-at,
  mouse / Q-E orbit, occlusion pull-in that eases back out and a wider FOV while sprinting.
- **Clock and light** (`Scripts/World/DayNightCycle.cs`). One game hour per 45 s, new game at 08:30, warm low sun,
  moonlit night, ambient and fog that follow, street lamps that glow after dark.
- **Traffic** (`Scripts/World/TrafficSystem.cs`). 110 danfos, kekes and cars in lanes on the right, keeping distance,
  slowing at rush hour on bridges and highways, riding the bridge decks.
- **HUD** (`Scripts/UI/Hud.cs`). Brand, district and street (or bridge) top-left, clock and day top-right, cash and
  RiseBank bottom-right, controls bottom-centre.
- **Editor tools** (`Editor/SceneSetup.cs`). Menu `NAIJA RISE ▸ Create Lagos Scene`, `Smoke Test World Build`,
  `Build macOS Player`, `Build WebGL Player`; all also run headless (below).

Everything is created from code at startup by `GameBootstrap` in `Assets/NaijaRise/Scenes/Lagos.unity`; the scene
itself only holds a camera, a sun and that one component.

## Run it

Open `unity/` in Unity Hub (editor 6000.6.5f1, the version in `ProjectSettings/ProjectVersion.txt`), open
`Assets/NaijaRise/Scenes/Lagos.unity` and press Play. WASD or left stick to move, Shift to sprint, Space to jump, mouse
or Q/E to look, Esc frees the cursor.

Headless, from the repo root:

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.6.5f1/Unity.app/Contents/MacOS/Unity"
npm run export:unity                                   # refresh the map after editing src/data/districts
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.SmokeTest -logFile -
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod NaijaRise.EditorTools.SceneSetup.BuildMac   -logFile -
open unity/Builds/NaijaRise-Lagos.app
```

The smoke test builds the whole city in edit mode and checks object counts, the spawn region and street, and the Eko
Bridge deck height; it exits non-zero on failure so it can run in CI.

## What is deliberately not here yet

This is the slice, not the port. Missing against the web Alpha 1.0:

- Rigged characters, wardrobe and pedestrians (the player is a capsule mannequin; the Ready Player Me / Mixamo rigs
  need a glTF importer, see below).
- Driving, vehicle ownership, LASTMA / police / heat, traffic lights and go-slow incidents (traffic is ambient only).
- Everything in `src/systems/`: jobs, economy, businesses, housing, education, family, missions, story, phone apps,
  saves. These are plain JavaScript game rules and port mechanically to C#; the data files
  (`src/data/*.js`) can be exported the same way as the map.
- The Kenney vehicle models, landmark GLBs and vegetation under `../assets/`. Unity 6 does not import `.glb` out of the
  box: add `com.unity.cloud.gltfast` to `Packages/manifest.json` (Window ▸ Package Manager ▸ Add by name) and the
  Meshopt-compressed files need decompressing first (they were compressed for the web build).
- Post-processing (bloom, ACES), environment reflections, dynamic resolution: the project is on the built-in render
  pipeline with no packages so it compiles anywhere. Moving to URP with the Post Processing volume is the natural step
  once the look is being judged.
- Water is walkable (a flat plane with a collider); a swim/blocker layer is a TODO.

## How to judge it (the roadmap's question)

Measure, then decide. Suggested checks against the web build on the same machine:

1. Frame time at the spawn and on Eko Bridge at 20:00 (lamps on, traffic in rush hour) — Unity Profiler vs the web
   build's dynamic-resolution step.
2. Time to add a district: edit `src/data/districts/*.js`, run `npm run export:unity`, press Play. Both editions should
   pick it up with zero code.
3. Controller feel on the same PlayStation pad (legacy Input Manager here; the Input System package is the upgrade path
   for native console mappings).
4. Build output: `Builds/NaijaRise-Lagos.app` size and startup time, and a WebGL build for parity with the Vercel
   deployment.

If Unity wins on 1 and 3, the port order is: systems and data export → vehicles and driving → characters via glTFast →
URP look → console input. If it does not, the slice has still produced a JSON map export that other tools can use.
