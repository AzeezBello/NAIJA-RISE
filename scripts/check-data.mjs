// Static data checks for the shared content files in src/data (exported to Unity by scripts/export-world.mjs).
// Run with `npm run check` (or `node scripts/check-data.mjs`).
// Catches the class of bug where a job or contact points at a place id that is missing from the merged Lagos map.
// Story missions live in unity/Assets/Rise/Scripts/Story/Story.cs.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

// The data modules read a few browser globals at import time.
globalThis.matchMedia ??= () => ({ matches: false });
globalThis.innerWidth ??= 1280;
globalThis.location ??= { hash: '', search: '' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data');
const load = f => import(pathToFileURL(resolve(root, f)).href);
const [L, J, C, I] = await Promise.all([load('locations.js'), load('jobs.js'), load('characters.js'), load('items.js')]);

const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

// 1. place ids are unique
const seen = new Set();
for (const p of L.PLACES) { if (seen.has(p.id)) err(`duplicate place id "${p.id}"`); seen.add(p.id); }

// 2. everything that references a place resolves through placeOf()
const resolves = id => !!L.placeOf(id);
const jobs = Array.isArray(J.JOBS) ? J.JOBS : Object.values(J.JOBS);
for (const j of jobs) if (j.at && !resolves(j.at)) err(`job "${j.id}" points at unknown place "${j.at}"`);
for (const c of Object.values(C.CONTACTS)) if (c.at && c.at !== 'family' && !resolves(c.at)) err(`contact "${c.id}" stands at unknown place "${c.at}"`);

// 3. job contacts exist
const contactIds = new Set(Object.values(C.CONTACTS).map(c => c.id));
for (const j of jobs) if (j.by && !contactIds.has(j.by)) err(`job "${j.id}" is given by unknown contact "${j.by}"`);

// 3b. contact runs deliver to real places, carry known items and pay a known reputation
const REPS = new Set(['public', 'business', 'street', 'social']);
let runs = 0;
for (const c of Object.values(C.CONTACTS)) for (const r of c.runs || []) {
  runs++;
  if (!resolves(r.dest)) err(`run "${r.text}" (${c.id}) delivers to unknown place "${r.dest}"`);
  if (!I.ITEMS[r.item]) err(`run "${r.text}" (${c.id}) carries unknown item "${r.item}"`);
  if (!REPS.has(r.rep)) err(`run "${r.text}" (${c.id}) pays unknown reputation "${r.rep}"`);
  if (!(r.minutes > 0 && r.reward > 0)) err(`run "${r.text}" (${c.id}) needs positive minutes and reward`);
  if (r.dest === c.at) err(`run "${r.text}" (${c.id}) delivers to the contact's own place`);
}

// 4. places sit inside the world bounds
const b = L.META.bounds;
for (const p of L.PLACES) if (p.x < b.x[0] || p.x > b.x[1] || p.z < b.z[0] || p.z > b.z[1]) err(`place "${p.id}" is outside the world bounds`);

// 5. places inside a water rectangle (warning only: Makoko is built on the lagoon on purpose)
const stilts = /makoko/;
for (const p of L.PLACES) if (L.inWater(p.x, p.z) && !stilts.test(p.id)) warn(`place "${p.id}" (${p.x}, ${p.z}) is inside a water rectangle`);

for (const w of warnings) console.warn('warn  ' + w);
for (const e of errors) console.error('ERROR ' + e);
console.log(`data check: ${L.PLACES.length} places, ${jobs.length} jobs, ${runs} contact runs, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
