// Family life-sim stub (Alpha 1.1 Track C1).
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
    msg: 'After church we dey wait you. Come eat with family.',
    done: 'Family wey stay together. Go well, my son.',
    xp: 8, rep: { social: 5 },
  },
];

export const requestOf = id => FAMILY_REQUESTS.find(r => r.id === id);