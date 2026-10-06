// Consumables get a use(state); mission items have no use.
export const ITEMS = {
  water: { name: 'Pure Water', desc: '+40 stamina', use: s => { s.stamina = Math.min(100, s.stamina + 40); } },
  suya: { name: 'Suya', desc: '+25 health', use: s => { s.health = Math.min(100, s.health + 25); } },
  package: { name: 'Sealed Package', desc: 'Deliver to Amaka at Iponri' },
  documents: { name: 'Documents', desc: 'Deliver to Amaka at Iponri' },
  laptop: { name: 'Laptop', desc: 'Freelance gigs pay double' },
  coldbox: { name: 'Vaccine Box', desc: 'Keep it cold — deliver fast' },
  cargo: { name: 'Fragile Glassware', desc: 'Stay under 90 km/h' },
};
