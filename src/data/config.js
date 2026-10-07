export const GAME = { title: 'NAIJA RISE', subtitle: 'LAGOS · SURULERE', version: 'Alpha 1.0', saveKey: 'naijarise.alpha10', saveVersion: 10 };
export const PRICES = { pet: 25000, water: 100, suya: 1500, posFee: 200, posAmount: 20000, hookup: 20000 };
export const ECON = { payCycle: 60, refuel: 3000, startCash: 50000, startBank: 120000, fineRate: 10000, bustRate: 15000, speedTicket: 2000 };
export const TIME = { daySpeed: 1 / 45, startClock: 17.25, venueOpen: 20, venueClose: 4 };   // 1 game hour per 45 real seconds
export const WORLD = { bounds: { x: [-145, 615], z: [-395, 325] }, spawn: { x: 0, z: 34 } };
// Low-end profile (touch devices or small screens): fewer NPCs and vehicles, lower pixel ratio, shadows off by default.
export const PERF = { lowEnd: typeof matchMedia !== 'undefined' && (matchMedia('(pointer:coarse)').matches || innerWidth < 900), npcs: { full: 22, low: 12 }, trafficCap: { full: 99, low: 12 }, rainDrops: { full: 1800, low: 700 } };
// Character pipeline: the first reachable rig wins. Ship your own at assets/characters/player.glb (Mixamo-compatible
// skeleton with Idle/Walk/Run clips); the three.js Soldier is the development placeholder.
// Character rigs. Every rig is a real human: rig 0 (the player and half the street) is a Ready Player Me avatar in a
// hoodie, jeans and sneakers animated with Ready Player Me's own locomotion clips (their licence allows the clips only
// on RPM avatars); Michelle and CesiumMan are Mixamo / Khronos humans animated with the three.js Soldier clips.
// Ship your own at assets/characters/player.glb (with Idle/Walk/Run baked in) and it replaces rig 0.
// `slots` map material names to wardrobe slots: top wears the fabric print or its colour, bottom / shoes / skin / hair tint.
const CDN = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/', RPM_ANIM = 'https://raw.githubusercontent.com/readyplayerme/animation-library/master/masculine/glb/';
export const CHARACTER = {
  height: 2.3, blend: 0.25, animRange: 120,
  rigs: [
    { id: 'rpm', urls: ['assets/characters/player.glb', CDN + 'readyplayer.me.glb'],
      anims: [{ key: 'idle', url: RPM_ANIM + 'idle/M_Standing_Idle_001.glb' }, { key: 'walk', url: RPM_ANIM + 'locomotion/M_Walk_001.glb' }, { key: 'run', url: RPM_ANIM + 'locomotion/M_Run_001.glb' }],
      clips: { idle: ['idle', 'Idle'], walk: ['walk', 'Walk'], run: ['run', 'Run'] }, headBone: 'Head', facing: 0,
      slots: { top: /Outfit_Top/, bottom: /Outfit_Bottom/, shoes: /Footwear/, skin: /Wolf3D_Body|Wolf3D_Skin/, beard: /Beard/, cap: /Headwear/ }, street: true, weight: 0.5 },
    { id: 'michelle', urls: [CDN + 'Michelle.glb'],
      anims: [{ key: 'idle', url: CDN + 'Soldier.glb', clip: 'Idle' }, { key: 'walk', url: CDN + 'Soldier.glb', clip: 'Walk' }, { key: 'run', url: CDN + 'Soldier.glb', clip: 'Run' }], stripPosition: true,
      clips: { idle: ['idle'], walk: ['walk'], run: ['run'] }, headBone: 'mixamorigHead', facing: 0, slots: { skin: /Ch03_Body/ }, street: true, weight: 0.3 },
    { id: 'cesium', urls: ['https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb'],
      clips: { idle: ['animation_0'], walk: ['animation_0'], run: ['animation_0'] }, idleFreeze: true, headBone: 'Skeleton_neck_joint_1', facing: 0, slots: { top: /Cesium/ }, tintOnly: true, street: true, weight: 0.2 },
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
  cafe: { browse: 500, courses: [['web', 'Web design', 40000], ['graphic', 'Graphic design', 30000], ['code', 'Coding', 60000]], gig: 25000 },
  football: { wager: 5000, tiers: ['Quick match', 'Neighbourhood tournament', 'Lagos championship'], prizes: [0, 20000, 100000] },
};
export const RENT = { agentFeeRate: 0.1, leaseDays: 30, tenantShare: 1 / 30 };   // tenants pay rent/30 per game day
export const SKILLS = { driving: 'Driving', business: 'Business', charisma: 'Charisma', fitness: 'Fitness' };
export const REPS = { public: 'Public', business: 'Business', street: 'Street', social: 'Social' };
export const DEALER = [['okada', 250000], ['keke', 350000], ['korope', 1200000], ['danfo', 2500000], ['car', 4000000]];
export const BIZ = { staffCost: 50000, staffBonus: 0.3, maxStaff: 3, priceEffect: { low: 0.8, normal: 1, high: 1.2 } };
export const AWAY = { minMinutes: 2, capMinutes: 480 };
export const WEATHER = { rainChance: 0.35, rainMinutes: [2, 5] };
