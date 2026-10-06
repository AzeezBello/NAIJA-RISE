export const GAME = { title: 'NAIJA RISE', subtitle: 'LAGOS · SURULERE', version: 'Alpha 0.9', saveKey: 'naijarise.alpha09', saveVersion: 9 };
export const PRICES = { pet: 25000, water: 100, suya: 1500, posFee: 200, posAmount: 20000, hookup: 20000 };
export const ECON = { payCycle: 60, refuel: 3000, startCash: 50000, startBank: 120000, fineRate: 10000, bustRate: 15000, speedTicket: 2000 };
export const TIME = { daySpeed: 1 / 45, startClock: 8.5, venueOpen: 20, venueClose: 4 };   // 1 game hour per 45 real seconds
export const WORLD = { bounds: { x: [-145, 475], z: [-145, 145] }, spawn: { x: 0, z: 34 } };
// Low-end profile (touch devices or small screens): fewer NPCs and vehicles, lower pixel ratio, shadows off by default.
export const PERF = { lowEnd: typeof matchMedia !== 'undefined' && (matchMedia('(pointer:coarse)').matches || innerWidth < 900), npcs: { full: 22, low: 12 }, trafficCap: { full: 99, low: 12 }, rainDrops: { full: 1800, low: 700 } };
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
