export const GAME = { title: 'NAIJA RISE', subtitle: 'LAGOS · SURULERE', version: 'Alpha 1.0', saveKey: 'naijarise.alpha10', saveVersion: 10 };
export const PRICES = { pet: 25000, water: 100, suya: 1500, posFee: 200, posAmount: 20000, hookup: 20000 };
export const ECON = { payCycle: 60, refuel: 3000, startCash: 50000, startBank: 120000, fineRate: 10000, bustRate: 15000, speedTicket: 2000 };
export const TIME = { daySpeed: 1 / 45, startClock: 8.5, venueOpen: 20, venueClose: 4 };   // 1 game hour per 45 real seconds
export const WORLD = { bounds: { x: [-520, 1120], z: [-1000, 410] }, spawn: { x: 0, z: 34 } };
// Low-end profile (touch devices or small screens): fewer NPCs and vehicles, lower pixel ratio, shadows off by default.
export const PERF = { lowEnd: typeof matchMedia !== 'undefined' && (matchMedia('(pointer:coarse)').matches || innerWidth < 900), npcs: { full: 72, low: 24 }, trafficCap: { full: 99, low: 12 }, rainDrops: { full: 1800, low: 700 } };
// Character pipeline: the first reachable rig wins. Ship your own at assets/characters/player.glb (Mixamo-compatible
// skeleton with Idle/Walk/Run clips); the three.js Soldier is the development placeholder.
// Character rigs. Every rig is a real human: rig 0 (the player and most of the street) is a Ready Player Me avatar in a
// hoodie, jeans and sneakers animated with Ready Player Me's own locomotion clips (their licence allows the clips only
// on RPM avatars); CesiumMan (Khronos) walks with his own clip. Clips are never borrowed across skeletons: Mixamo's
// Michelle driven by the Soldier clips came out folded in half, so each rig must ship its own Idle/Walk/Run.
// Ship your own at assets/characters/player.glb (with Idle/Walk/Run baked in) and it replaces rig 0.
// `slots` map material names to wardrobe slots: top wears the fabric print or its colour, bottom / shoes / skin / hair tint.
const CDN = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/', RPM_ANIM = 'https://raw.githubusercontent.com/readyplayerme/animation-library/master/masculine/glb/';
export const CHARACTER = {
  height: 2.3, 
  blend: 0.25, 
  animRange: 120, 
  enterExitT: 0.55,   // seconds for door blend
  // Enter/exit vehicle blend duration (seconds). Clips optional — pose holds if missing.
  enterExit: 0.85,
  rigs: [
    {
      id: 'rpm',
      urls: ['assets/characters/player.glb', CDN + 'readyplayer.me.glb'],
      anims: [
        { key: 'idle', url: RPM_ANIM + 'idle/M_Standing_Idle_001.glb' },
        { key: 'walk', url: RPM_ANIM + 'locomotion/M_Walk_001.glb' },
        { key: 'run',  url: RPM_ANIM + 'locomotion/M_Run_001.glb' },
        // Optional — drop files when you have them; ignored if URL 404s
        // { key: 'turn', url: RPM_ANIM + 'locomotion/M_TurnLeft_001.glb' },
        // { key: 'stop', url: RPM_ANIM + 'locomotion/M_WalkStop_001.glb' },
      ],
      clips: {
        idle:  ['idle', 'Idle', 'Idle_Neutral', 'M_Standing_Idle_001'],
        walk:  ['walk', 'Walk', 'Walking', 'M_Walk_001'],
        run:   ['run', 'Run', 'Running', 'M_Run_001'],
        // Optional — fall back in setState if missing
        turn:  ['turn', 'Turn', 'TurnLeft', 'turn_left', 'LeftTurn', 'M_Turn_001'],
        stop:  ['stop', 'Stop', 'WalkStop', 'walk_stop', 'Idle'],
        enter: ['enter', 'Enter', 'EnterCar', 'enter_car', 'Idle'],
        exit:  ['exit', 'Exit', 'ExitCar', 'exit_car', 'Idle'],
        jump:  ['jump', 'Jump', 'Idle'],
      },
      headBone: 'Head', facing: 0,
      slots: {
        top: /Outfit_Top/, bottom: /Outfit_Bottom/, shoes: /Footwear/,
        skin: /Wolf3D_Body|Wolf3D_Skin/, beard: /Beard/, cap: /Headwear/,
      },
      street: true, weight: 0.7,
    },
    {
      id: 'cesium',
      urls: ['https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb'],
      clips: {
        idle: ['animation_0'], walk: ['animation_0'], run: ['animation_0'],
        turn: ['animation_0'], stop: ['animation_0'],
      },
      idleFreeze: true, headBone: 'Skeleton_neck_joint_1', facing: 0,
      slots: { top: /Cesium/ }, tintOnly: true, street: true, weight: 0.3,
    },
  ],
};

export const LAW = { pursuitHeat: 3, bustSeconds: 2.5, ticketKmh: 90, checkpointKmh: 60 };
// Life Level titles (PRD §6). Apps and content can require a level via minLevel.
export const LEVELS = [[1, 'Newcomer'], [3, 'Hustler'], [6, 'Entrepreneur'], [10, 'Mogul']];
export const levelTitle = lvl => LEVELS.filter(([n]) => lvl >= n).pop()[1];
export const UNLOCKS = { 2: 'Businesses and Property unlocked', 3: 'Hustler rank — more respect on the street', 6: 'Entrepreneur rank' };
export const UPGRADES = [['generator', 'Generator', 150000, 'Lights stay on during NEPA outages; sleeping here restores +10 max stamina feel'], ['tank', 'Water tank', 80000, 'Stamina recovers 25% faster'], ['security', 'Security', 120000, 'No pickpockets at the clubs; agberos keep off']];
export const PLACES_CFG = {
  gym: { dayPass: 2000, monthly: 25000, trainer: 10000, boxingMin: 20 },
  food: [['Jollof rice & chicken', 3500, 60, 10], ['Shawarma', 2500, 40, 5], ['Chapman', 1500, 20, 0], ['Business lunch', 8000, 50, 5]],
  mall: { outfit: 15000, laptop: 250000, groceries: 6000, barber: 2000 },
  cinema: { ticket: 5000, movies: ['King of Boys III', 'Danfo Chronicles', 'Lagos Never Sleeps'] },
  cafe: {
    browse: 500, gig: 25000,
    // id, name, cost, hours, skill gains, unlocks job ids
    courses: [
      ['web', 'Web design', 40000, 3, { business: 6, charisma: 2 }, ['webdev']],
      ['graphic', 'Graphic design', 30000, 3, { business: 5, charisma: 3 }, ['designer']],
      ['code', 'Coding', 60000, 4, { business: 8 }, ['webdev', 'coder']],
      ['pos', 'POS & bookkeeping', 25000, 2, { business: 7 }, ['posagent']],
      ['driving', 'Defensive driving', 35000, 3, { driving: 10 }, ['courier', 'tanker']],
    ],
  },
  // Training centre at Community Grammar School: evening adult classes, extra credit if you paid Chioma's levy
  school: {
    levyHelp: 2000, eveningClass: 15000, eveningSkill: { business: 3 },
    yabaTech: { enrollment: 25000, semester: 18000, semesters: 3, duration: 4, stamina: 25 },
  },
  football: { wager: 5000, tiers: ['Quick match', 'Neighbourhood tournament', 'Lagos championship'], prizes: [0, 20000, 100000] },
};
export const RENT = { agentFeeRate: 0.1, leaseDays: 30, tenantShare: 1 / 30 };   // tenants pay rent/30 per game day
export const SKILLS = { driving: 'Driving', business: 'Business', charisma: 'Charisma', fitness: 'Fitness', strength: 'Strength' };
export const REPS = { public: 'Public', business: 'Business', street: 'Street', social: 'Social' };
export const DEALER = [['okada', 250000], ['keke', 350000], ['korope', 1200000], ['danfo', 2500000], ['car', 4000000]];
export const BIZ = { staffCost: 50000, staffBonus: 0.3, maxStaff: 3, priceEffect: { low: 0.8, normal: 1, high: 1.2 } };
export const AWAY = { minMinutes: 2, capMinutes: 480 };
export const WEATHER = { rainChance: 0.35, rainMinutes: [2, 5] };
