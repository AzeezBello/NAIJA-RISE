export const GAME = { title: 'Rise: Hustle or Die Trying', subtitle: 'HUSTLE OR DIE TRYING', version: 'Alpha 1.0', saveKey: 'rise.alpha10', saveVersion: 10 };
export const PRICES = { pet: 25000, water: 100, suya: 1500, posFee: 200, posAmount: 20000, hookup: 20000 };
export const ECON = { payCycle: 60, refuel: 3000, startCash: 50000, startBank: 120000, fineRate: 10000, bustRate: 15000, speedTicket: 2000 };
export const TIME = { daySpeed: 1 / 45, startClock: 8.5, venueOpen: 20, venueClose: 4, startDate: '1999-01-01', startYear: 1999, startMonth: 1, startDay: 1 };   // 1 game hour per 45 real seconds; calendar starts Jan 1, 1999
export const WORLD = { bounds: { x: [-520, 1120], z: [-1000, 410] }, spawn: { x: 0, z: 34 } };
// Low-end profile (touch devices or small screens): fewer NPCs and vehicles, lower pixel ratio, shadows off by default.
// Low-end profile = touch-first devices or very little RAM. Window width is deliberately not used: a narrow desktop window
// (or a touch laptop with a mouse) used to be locked into the low profile; slow GPUs are handled by core/quality.js (Auto).
const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
const LOW_RAM = typeof navigator !== 'undefined' && (navigator.deviceMemory || 8) <= 2;
export const PERF = { lowEnd: COARSE || LOW_RAM, npcs: { full: 110, low: 32 }, trafficCap: { full: 99, low: 16 }, rainDrops: { full: 1800, low: 700 } };
// Character rigs. Every rig is a real human: rig 0 (the player and most of the street) is a Ready Player Me avatar in a
// hoodie, jeans and sneakers animated with Ready Player Me's own locomotion clips (their licence allows the clips only
// on RPM avatars); CesiumMan (Khronos) walks with his own clip. Clips are never borrowed across skeletons:
// each rig must ship its own Idle/Walk/Run.
// `slots` map material names to wardrobe slots: top wears the fabric print or its colour, bottom / shoes / skin / hair tint.
const CDN = 'assets/characters/', RPM_ANIM = 'assets/characters/';
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
export const DEALER = [['okada', 250000], ['keke', 350000], ['korope', 1200000], ['danfo', 2500000], ['car', 4000000], ['pickup', 5500000], ['brt', 12000000], ['luxury', 18000000]];
export const BIZ = { staffCost: 50000, staffBonus: 0.3, maxStaff: 3, priceEffect: { low: 0.8, normal: 1, high: 1.2 } };
export const AWAY = { minMinutes: 2, capMinutes: 480 };
export const WEATHER = { rainChance: 0.15, rainMinutes: [2, 5] };
export const HISTORIC_EVENTS = [
  { id: 'transition_1999', category: 'civic', year: 1999, month: 1, day: 1, title: '1999 Fourth Republic Transition', headline: 'INEC Releases Transition Timetable as Nigeria Prepares for Return to Civilian Rule' },
  { id: 'election_1999', category: 'election', year: 1999, month: 2, day: 27, title: '1999 Nigerian General Elections', headline: 'Millions Vote Across Lagos as Obasanjo & Tinubu Win Historic Fourth Republic Mandate' },
  { id: 'democracy_day_1999', category: 'civic', year: 1999, month: 5, day: 29, title: 'Fourth Republic Inauguration (Democracy Day)', headline: 'Fourth Republic Born! Celebrations Fill Tafawa Balewa Square & National Stadium' },
  { id: 'millennium_2000', category: 'culture', year: 2000, month: 1, day: 1, title: 'Y2K Millennium Dawn in Lagos', headline: 'Lagos Welcomes the New Millennium — Cybercafés & Nollywood Boom Across Surulere' },
  { id: 'gsm_revolution_2001', category: 'telecom', year: 2001, month: 1, day: 1, title: '2001 GSM Mobile Telecom Revolution', headline: 'MTN & Econet Launch GSM Networks — SIM Cards & Nokia 3310s Transform Computer Village Ikeja' },
  { id: 'election_2003', category: 'election', year: 2003, month: 1, day: 1, title: '2003 Nigerian General Elections', headline: 'Lagosians Head to the Polls for Historic Civilian-to-Civilian Transition' },
  { id: 'cbn_consolidation_2004', category: 'economy', year: 2004, month: 1, day: 1, title: 'CBN ₦25B Banking Consolidation & EFCC Sweep', headline: 'CBN Orders ₦25 Billion Bank Recapitalisation; EFCC Launches Anti-Graft Sweep on Broad Street' },
  { id: 'election_2007', category: 'election', year: 2007, month: 1, day: 1, title: '2007 General Elections & Lagos BRT Launch', headline: 'Babatunde Fashola Elected Governor; Mile 12–CMS BRT Lanes Open' },
  { id: 'election_2011', category: 'election', year: 2011, month: 1, day: 1, title: '2011 Nigerian General Elections', headline: 'Youth Social Media Wave & Record Turnout Across Lagos Polling Units' },
  { id: 'occupy_nigeria_2012', category: 'civic', year: 2012, month: 1, day: 1, title: '2012 Fuel Subsidy Protests & Lekki-Ikoyi Link Bridge', headline: 'Crowds Gather at Ojota Over Fuel Price Hike; Iconic Lekki-Ikoyi Cable Bridge Nears Completion' },
  { id: 'afcon_2013', category: 'sports', year: 2013, month: 1, day: 1, title: 'Super Eagles Win AFCON 2013 Trophy', headline: 'Super Eagles Crowned African Champions! Victory Parties Rock Teslim Balogun Stadium & Afrika Shrine' },
  { id: 'ebola_response_2014', category: 'pandemic', year: 2014, month: 1, day: 1, title: '2014 Lagos Defeats Ebola Outbreak', headline: 'Heroic Lagos Medics & Contact Tracers Contain Ebola; WHO Declares Nigeria Ebola-Free' },
  { id: 'election_2015', category: 'election', year: 2015, month: 1, day: 1, title: '2015 Historic General Elections (PVC Card Readers)', headline: 'Permanent Voter Cards (PVCs) Debut in Historic Democratic Alternation' },
  { id: 'fintech_wave_2016', category: 'economy', year: 2016, month: 1, day: 1, title: 'Yaba Silicon Lagoon & Fintech Startup Boom', headline: 'Yaba Silicon Lagoon Startups (Paystack, Flutterwave) Attract Global Billions' },
  { id: 'election_2019', category: 'election', year: 2019, month: 1, day: 1, title: '2019 Nigerian General Elections', headline: 'Babajide Sanwo-Olu Elected Governor of Lagos Under THEMES Agenda' },
  { id: 'covid19_lockdown_2020', category: 'pandemic', year: 2020, month: 1, day: 1, title: 'COVID-19 Pandemic, NCDC Lockdown & Relief Effort', headline: 'NCDC Declares Lagos Lockdown & Curfew — Nose Masks Mandatory, Essential Logistics Boom' },
  { id: 'election_2023', category: 'election', year: 2023, month: 1, day: 1, title: '2023 General Elections & CBN Naira Redesign', headline: 'BVAS Accreditation, CBN New Naira Notes & Historic Presidential / Lagos Polls' },
  { id: 'lrmt_rail_era_2024', category: 'infrastructure', year: 2024, month: 1, day: 1, title: 'LRMT Blue & Red Line Rail Era & Detty December Boom', headline: 'Lagos Blue & Red Line Electric Trains Carry Millions; Afrobeats & Detty December Top Global Charts' },
];
