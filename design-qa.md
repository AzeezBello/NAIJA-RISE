# Design QA — Alpha 1.0

## Implemented
- Natural look restored (neutral grade, 08:30 start, original day palette, brighter moonlit night), original yellow danfo and korope, muted work-wear tints on single-material bodies, root motion locked on every animation clip (hips x/z fixed) so walk and run cycles never slide and snap back.
- Corridors: Falomo and Third Mainland decks, VI / Lekki / Yaba / Ebute Metta / Ikorodu blocks and landmarks, five water bodies, toll plaza, footbridges, danfo queues, road-works diversions, long-distance jobs, data-driven roads and lights, region rectangles, bigger minimap and phone map.
- Graphics levels (Auto/Low/Medium/High) with GPU detection, adaptive step-down, 8-bit fallback for the HDR target, half-res bloom, frustum-culled characters, near-only character shadows, crowd and traffic caps. Story contacts spawned as characters with an objective arrow; missions, GPS and prompts target the person.
- Kenney Car Kit vehicles with palette repainting (danfo yellow, LAWMA orange, army olive, liveries), headlights, police/fire light bars and rolling wheels; house detail pass (ledges, balconies, ACs, tanks, dishes, awnings, generators).
- Poster look: HDR composer with bloom, split-tone grade and vignette; environment reflections; wet roads and stronger bloom after dark; golden-hour → ember → twilight → night sky palette; new games start at 17:15. Three human street rigs (Ready Player Me, Michelle, CesiumMan) with eleven outfit types and random wardrobe; rigs on by default on phones; title-screen preload.
- Character pipeline: rigged GLB player and pedestrians with Idle/Walk/Run cross-fades driven by the controller states, primitive fallback, Nigerian wardrobe (ankara shirt / senator / buba & sokoto / agbada / Super Eagles / t-shirt in procedural ankara, adire, aso-oke and lace prints, fila and face cap), eleven-slot customiser (skin, face, body, hair, hair colour, facial hair, outfit, fabric, trousers, shoes, accessory) with head-bone accessories, skinned shadows, Settings toggle for the rig.
- Game HUD ("The Lagos Experience"): top bar with brand, district/street, clock, day icon and day counter; objective card with distance and direction arrow above the minimap; money/level card with portrait, cash, bank, level title, XP and heat; health/energy bars and a verb-and-target interaction prompt bottom-centre; vehicle gauges replace vitals when driving; dialogue box with numbered choices.
- Phone with ten apps (Map, Jobs, Messages, Contacts, Bank, Business, Property, Inventory, Character, Settings); Business and Property lock until Level 2. Jobs show skill bonuses and skill gates; Business has staff hiring and price levels; Character shows four skills and four reputations.
- Title scene over a live, orbiting view of the city; Continue / New game.
- Responsive layout at phone and tablet sizes; touch joystick and action buttons; gamepad; arrow keys.
- Graphics pass: textured facades with lit windows, asphalt, sidewalks, solar street lights, sky dome, sun, clouds, ACES tone mapping; Surulere compounds (bungalow / storey / high-rise mix with fences and gates); moonlit night keyframes.

## Verified (headless Chrome, swiftshader, 1440×900 and 390×844)
- Alpha 0.10 run: desktop boots on primitives, the Soldier placeholder rig streams in and swaps the player and all 22 pedestrians in place (idle/walk/run actions bound, Idle → Walk → Run cross-fades follow `G.moveState`, skinned shadow on the ground, walk bob and sprint lean disabled on the rig); Character app changes to skin, hair colour, body type, shoes, cap and beard tint the rig, scale the body and hang two accessories off the head bone; mobile low-end profile keeps primitives for the player and 12 pedestrians with zero errors; Next.js production build compiles with the engine synced.
- 59 engine modules parse with `node --check` (`npm run check`).
- Static build: title → city boots with 21 traffic vehicles, 22 pedestrians, 13 animals; Jobs start, Bank deposit, Character hair change, Map route; mission 1 dialogue with choice 2 (legit path) advances to mission 2 and adds Documents; danfo drives with speedometer and gear; Heat 4 puts two police cars in pursuit; mobile viewport shows touch controls and a 300px phone. Zero page errors. Housing: agent dialogue at the gate, renting the room (₦66,000 incl. fee), daily tenant income and lease expiry eviction all verified.
- Next.js 16 (Turbopack) dev server and production build both serve `/` and `/play`; `/play` boots the engine with the HUD; landing page renders the R3F canvas.
- Alpha 0.9 run: traffic stops at red lights; gym, cyber café, football, mall and cinema menus change money, skills, reputation and the clock; the player stands at 6.5 m on the Shitta flyover; a car climbs 0 → 3.7 → 9 → 3.9 → 0 m across Eko Bridge with the locale reading "Eko Bridge · Lagos Lagoon"; seven vehicles run on Lagos Island; GPS routes from Surulere to CMS. Zero page errors.
- Alpha 0.8 performance pass (headless, first frame after entering the city):

  | Profile | Scene objects | Meshes | Draw calls | Triangles | Shadow map | Pixel ratio | NPCs / vehicles |
  |---|---|---|---|---|---|---|---|
  | Desktop 1440×900 | 563 | 327 | 501 | 30k | 2048, follows player | 1 | 22 / 21 |
  | Mobile 390×844 (low-end profile) | 555 | 334 | 174 | 17k | 1024, shadows off | 1.5 | 12 / 12 |

  Walk bob and the street/landmark location indicator verified on both.
- Alpha 0.7 run: PWA manifest and service worker served; Crossroads forks to the legit arc; Cold Chain starts a timed task and completes at the school; Warehouse Run completes under the speed cap; the Marina race starts with a rival and is won through four checkpoints; the risk arc's Vehicle Recovery marks the sedan and completes at Ladipo; Getaway sets Heat 4, police pursue, roadblocks appear and the escape resolves; the arrest dialogue offers a bribe; roadblocks clear at Heat 0; stock, rival and restock show in Business; a water-tank upgrade installs; a storm floods Ojuelegba; harmattan haze shortens the fog.
- Alpha 0.6 run: a 0.5 save migrates (title shows Continue, skills and reputation default in); ten jobs with three skill-locked; staff hire and high pricing on the kiosk; dealer purchase parks an owned vehicle; entering a stranger's danfo adds heat; rain darkens the sun; the chase mission sets Heat 3 and police pursue; delivering to Baba K completes the story.

## Manual browser QA still to do
- Real-device touch feel (joystick dead zone, button sizes) on Android and iOS.
- Gamepad mapping on a physical controller (tested only through the Gamepad API contract).
- Frame rate on mid-range laptops with shadows on; shadow map is 4096 over the whole district.
- Night pass with NEPA outage verified headless (windows dark, solar street lights stay on); confirm on real GPUs that the moonlit level reads well.
