export const GAME = { title: 'NAIJA RISE', subtitle: 'LAGOS · SURULERE', version: 'Alpha 0.5', saveKey: 'naijarise.alpha05', saveVersion: 5 };
export const PRICES = { pet: 25000, water: 100, suya: 1500, posFee: 200, posAmount: 20000, hookup: 20000 };
export const ECON = { payCycle: 60, refuel: 3000, startCash: 50000, startBank: 120000, fineRate: 10000, bustRate: 15000, speedTicket: 2000 };
export const TIME = { daySpeed: 1 / 45, startClock: 8.5, venueOpen: 20, venueClose: 4 };   // 1 game hour per 45 real seconds
export const WORLD = { bounds: 145, spawn: { x: 0, z: 34 } };
export const LAW = { pursuitHeat: 3, bustSeconds: 2.5, ticketKmh: 90, checkpointKmh: 60 };
// Life Level titles (PRD §6). Apps and content can require a level via minLevel.
export const LEVELS = [[1, 'Newcomer'], [3, 'Hustler'], [6, 'Entrepreneur'], [10, 'Mogul']];
export const levelTitle = lvl => LEVELS.filter(([n]) => lvl >= n).pop()[1];
export const UNLOCKS = { 2: 'Businesses and Property unlocked', 3: 'Hustler rank — more respect on the street', 6: 'Entrepreneur rank' };
export const RENT = { agentFeeRate: 0.1, leaseDays: 30, tenantShare: 1 / 30 };   // tenants pay rent/30 per game day
