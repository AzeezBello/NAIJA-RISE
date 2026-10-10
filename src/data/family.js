// Family life simulation (Alpha 1.1 Track C1).
// Home is a face-me-I-face-you compound off Adelabu; mum and sibling stand in the yard.

export const FAMILY_HOME = {
  id: 'family',
  name: 'Family Compound · Adelabu',
  x: -88, z: 28,
  door: { x: -88, z: 17.5 },
};

// Static roster — also mirrored into CONTACTS for msg()/phone.
export const FAMILY = [
  {
    id: 'mum',
    name: 'Mama Tunde',
    role: 'Mother · Adelabu',
    at: 'family',
    c: '#e8b86d',
    line: 'My son, you no go come see your mother?',
    // Stand offset from FAMILY_HOME centre
    offset: { x: -2.5, z: -6 },
    look: { outfit: 9, shirt: 0, pants: 5, skin: 3, hair: 3, bodyType: 2, accessory: 0, facialHair: 0 },
  },
  {
    id: 'sibling',
    name: 'Chioma',
    role: 'Sister · Adelabu',
    at: 'family',
    c: '#7ec8e3',
    line: 'Abeg help me with something small.',
    offset: { x: 3, z: -5 },
    look: { outfit: 10, shirt: 1, pants: 0, skin: 2, hair: 3, bodyType: 0, accessory: 0, facialHair: 0 },
  },
];

export const familyOf = id => FAMILY.find(f => f.id === id);

/**
 * Request templates. `who` is the family member who issues it.
 * `kind`: money | visit | fetch
 * Completion is checked in systems/family.js.
 */
export const FAMILY_REQUESTS = [
  {
    id: 'chop_money',
    who: 'mum',
    title: 'Chop money',
    blurb: 'Mama need small money for market.',
    kind: 'money',
    amount: 5000,
    need: 'food',
    threshold: 76,
    restore: 55,
    msg: 'My son, abeg send ₦5,000 for market. Pepper don cost.',
    done: 'God bless you. I go cook something nice when you come.',
    xp: 8, rep: { social: 3 },
  },
  {
    id: 'visit_home',
    who: 'mum',
    title: 'Come home',
    blurb: 'Visit Mama at the compound.',
    kind: 'visit',
    need: 'companionship',
    threshold: 76,
    restore: 45,
    msg: 'You don forget the road to this house? Come greet your mother today.',
    done: 'My son don come. Sit down, make I bring water.',
    xp: 6, rep: { social: 4 },
  },
  {
    id: 'market_errand',
    who: 'sibling',
    title: 'Market errand',
    blurb: 'Buy suya for Chioma at a kiosk / Yaba.',
    kind: 'fetch',
    item: 'suya',
    need: 'food',
    threshold: 76,
    restore: 40,
    msg: 'Abeg buy suya for me. I go repay you later — or maybe not.',
    done: 'You try! This suya sweet die.',
    xp: 7, rep: { social: 2 },
  },
  {
    id: 'school_levy',
    who: 'sibling',
    title: 'School levy',
    blurb: 'Chioma needs ₦8,000 for a school levy.',
    kind: 'money',
    amount: 8000,
    need: 'education',
    threshold: 76,
    restore: 55,
    msg: 'School levy is ₦8,000. Daddy no dey around. You fit help?',
    done: 'Thank you jare. I no go disappoint you for school.',
    xp: 10, rep: { social: 3 },
  },
  {
    id: 'sunday_visit',
    who: 'mum',
    title: 'Sunday visit',
    blurb: 'Spend time at home (visit).',
    kind: 'visit',
    need: 'companionship',
    threshold: 76,
    restore: 50,
    msg: 'After church we dey wait you. Come eat with family.',
    done: 'Family wey stay together. Go well, my son.',
    xp: 8, rep: { social: 5 },
  },
  {
    id: 'bring_water',
    who: 'mum',
    title: 'Bring drinking water',
    blurb: 'Mama needs drinking water at home.',
    kind: 'fetch',
    item: 'water',
    need: 'food',
    threshold: 55,
    restore: 35,
    msg: 'My son, abeg bring sachet water when you dey come. NEPA don affect our pumping machine.',
    done: 'Thank you. Cold water fit solve plenty wahala.',
    xp: 6, rep: { social: 2 },
  },
];

export const requestOf = id => FAMILY_REQUESTS.find(r => r.id === id);
export const RELATIONSHIP_LEVELS = [
  { min: 0, label: 'Strained' },
  { min: 20, label: 'Distant' },
  { min: 40, label: 'Warm' },
  { min: 65, label: 'Close' },
  { min: 85, label: 'Unshakable' },
];
export const relationshipLabel = score => {
  let label = RELATIONSHIP_LEVELS[0].label;
  for (const level of RELATIONSHIP_LEVELS) {
    if (score >= level.min) label = level.label;
  }
  return label;
};
export const FAMILY_NEED_LABELS = {
  food: 'Household',
  education: 'School',
  companionship: 'Togetherness',
};

// ---- C1.5 schedules ----------------------------------------------------------
// Clock is G.state.clock (0–24). Each window: [startHour, endHour) → world spot.
// Chioma "school" uses a stand-in near the existing school landmark if present,
// else a fixed Surulere yard point.

export const FAMILY_SPOTS = {
  home_yard:   { x: -88, z: 22 },
  home_door:   { x: -88, z: 17.5 },
  market_edge: { x: -48, z: -52 },   // near Yaba / market corridor
  school_gate: { x: 12, z: -70 },    // override in code if placeOf('school') exists
  church_side: { x: -40, z: 40 },
};

/** Per-member day plan. First matching window wins. */
export const FAMILY_SCHEDULES = {
  mum: [
    { from: 5,  to: 9,  spot: 'home_yard',  label: 'home' },
    { from: 9,  to: 14, spot: 'market_edge', label: 'market' },
    { from: 14, to: 18, spot: 'home_yard',  label: 'home' },
    { from: 18, to: 22, spot: 'home_door',  label: 'home' },
    { from: 22, to: 24, spot: 'home_yard',  label: 'sleep' },
    { from: 0,  to: 5,  spot: 'home_yard',  label: 'sleep' },
  ],
  sibling: [
    { from: 6,  to: 8,  spot: 'home_yard',   label: 'home' },
    { from: 8,  to: 14, spot: 'school_gate', label: 'school' },
    { from: 14, to: 17, spot: 'market_edge', label: 'errand' },
    { from: 17, to: 21, spot: 'home_door',   label: 'home' },
    { from: 21, to: 24, spot: 'home_yard',   label: 'sleep' },
    { from: 0,  to: 6,  spot: 'home_yard',   label: 'sleep' },
  ],
};

/** Which request kinds require the issuer to be at a label. */
export const REQUEST_NEED_LABEL = {
  chop_money:   ['home'],
  visit_home:   ['home'],
  sunday_visit: ['home'],
  school_levy:  ['home', 'school'],
  market_errand:['home', 'errand', 'market'],
};

export function scheduleSlot(who, clock) {
  const plan = FAMILY_SCHEDULES[who];
  if (!plan) return null;
  const h = ((clock % 24) + 24) % 24;
  return plan.find(w => h >= w.from && h < w.to) || plan[0];
}

export function spotCoords(spotId) {
  return FAMILY_SPOTS[spotId] || FAMILY_SPOTS.home_yard;
}