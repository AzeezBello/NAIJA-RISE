// at = place id (data/locations.js); by = contact who messages you after the shift.
// skill = the attribute this job trains and that raises its pay; min = skill level needed to take it.
export const JOBS = [
  { id: 'rider', title: 'Delivery Rider', where: 'Yaba Market', at: 'yaba', pay: 8000, xp: 15, dur: 4, by: 'nkechi', skill: 'driving' },
  { id: 'shop', title: 'Shop Assistant', where: 'Ojuelegba', at: 'ojuelegba', pay: 6000, xp: 10, dur: 3, by: 'babak', skill: 'business' },
  { id: 'guard', title: 'Security Guard', where: 'Iponri', at: 'marina', pay: 10000, xp: 18, dur: 5, by: 'amaka', skill: 'fitness' },
  { id: 'mech', title: 'Mechanic Helper', where: 'Ladipo Garage', at: 'ladipo', pay: 9000, xp: 16, dur: 4, by: 'dayo', skill: 'driving' },
  { id: 'conductor', title: 'Danfo Conductor', where: 'Kilo Bus Stop', at: 'kilo', pay: 7000, xp: 14, dur: 4, by: 'driver', skill: 'charisma' },
  { id: 'steward', title: 'Stadium Steward', where: 'National Stadium', at: 'stadstop', pay: 9500, xp: 17, dur: 5, by: 'bayo', skill: 'fitness' },
  { id: 'porter', title: 'Market Porter', where: 'Shitta Market', at: 'shitta', pay: 5000, xp: 9, dur: 3, by: 'nkechi', skill: 'fitness' },
  { id: 'posagent', title: 'POS Agent', where: 'Mushin Bus Stop', at: 'mushinstop', pay: 12000, xp: 20, dur: 5, by: 'driver', skill: 'business', min: 10 },
  { id: 'bouncer', title: 'Bouncer', where: 'Lust Club', at: 'lust', pay: 15000, xp: 22, dur: 5, by: 'amaka', skill: 'fitness', min: 15, night: true },
  { id: 'courier', title: 'Island Courier', where: 'CMS, Lagos Island', at: 'cms', pay: 14000, xp: 22, dur: 4, by: 'amaka', skill: 'driving', min: 10 },
  { id: 'tanker', title: 'Tanker Driver', where: 'Mobil Filling Station', at: 'fuel', pay: 18000, xp: 25, dur: 6, by: 'dayo', skill: 'driving', min: 20 },
];
export const jobOf = id => JOBS.find(j => j.id === id) || null;
export const jobPay = (j, skills) => Math.round(j.pay * (1 + (skills?.[j.skill] || 0) * 0.01));   // +1% per skill point
