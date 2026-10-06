// at = place id (data/locations.js); by = contact who messages you after the shift.
export const JOBS = [
  { id: 'rider', title: 'Delivery Rider', where: 'Yaba Market', at: 'yaba', pay: 8000, xp: 15, dur: 4, by: 'nkechi' },
  { id: 'shop', title: 'Shop Assistant', where: 'Ojuelegba', at: 'ojuelegba', pay: 6000, xp: 10, dur: 3, by: 'babak' },
  { id: 'guard', title: 'Security Guard', where: 'Marina', at: 'marina', pay: 10000, xp: 18, dur: 5, by: 'amaka' },
  { id: 'mech', title: 'Mechanic Helper', where: 'Ladipo Garage', at: 'ladipo', pay: 9000, xp: 16, dur: 4, by: 'dayo' },
  { id: 'conductor', title: 'Danfo Conductor', where: 'Kilo Bus Stop', at: 'kilo', pay: 7000, xp: 14, dur: 4, by: 'driver' },
  { id: 'steward', title: 'Stadium Steward', where: 'National Stadium', at: 'stadstop', pay: 9500, xp: 17, dur: 5, by: 'bayo' },
];
export const jobOf = id => JOBS.find(j => j.id === id) || null;
