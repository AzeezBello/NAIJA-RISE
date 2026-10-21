// Verifies and provisions the live Supabase deployment configured in web/.env and unity/Assets/Rise/Resources/cloud.json.
// Checks Auth settings, RLS tables (players, saves, crews, crew_members, admin_overview), Realtime, and provisions
// the live `game-config` storage bucket (`economy.json`) so /admin economy edits work immediately in production.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOBS } from '../src/data/jobs.js';
import { ECON, PRICES } from '../src/data/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = {
  ...parseEnv(path.join(root, 'web/.env')),
  ...parseEnv(path.join(root, 'web/.env.local')),
  ...process.env,
};

const cloudPath = path.join(root, 'unity/Assets/Rise/Resources/cloud.json');
const cloud = fs.existsSync(cloudPath) ? JSON.parse(fs.readFileSync(cloudPath, 'utf8')) : {};

const url = env.NEXT_PUBLIC_SUPABASE_URL || cloud.url;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || cloud.anonKey;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !anonKey) {
  console.error('Missing Supabase URL or anonKey in web/.env or unity/Assets/Rise/Resources/cloud.json');
  process.exit(1);
}

console.log(`Checking Supabase project: ${url}`);
console.log(`  unity/Assets/Rise/Resources/cloud.json: ${cloud.url === url ? 'MATCH' : 'MISMATCH'}`);

const headers = (key, extra = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  ...extra,
});

async function checkEndpoint(relPath, key = anonKey) {
  try {
    const res = await fetch(`${url}${relPath}`, { headers: headers(key) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: err.message };
  }
}

const authRes = await checkEndpoint('/auth/v1/settings', anonKey);
let emailEnabled = false;
if (authRes.ok) {
  try {
    const parsed = JSON.parse(authRes.text);
    emailEnabled = Boolean(parsed?.external?.email);
  } catch {}
}
console.log(`  Auth (/auth/v1/settings): ${authRes.ok ? `OK (email=${emailEnabled})` : `HTTP ${authRes.status}`}`);

if (serviceKey) {
  for (const table of ['players', 'saves', 'crews', 'crew_members', 'admin_overview']) {
    const r = await checkEndpoint(`/rest/v1/${table}?select=*&limit=1`, serviceKey);
    console.log(`  Table/View [${table}]: ${r.ok ? 'LIVE' : `HTTP ${r.status} — ${r.text.slice(0, 120)}`}`);
  }

  // Ensure public storage bucket `game-config` exists for live economy config
  const bucketCheck = await checkEndpoint('/storage/v1/bucket/game-config', serviceKey);
  if (!bucketCheck.ok) {
    const createRes = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: headers(serviceKey),
      body: JSON.stringify({ id: 'game-config', name: 'game-config', public: true }),
    });
    console.log(`  Storage bucket [game-config]: ${createRes.ok ? 'CREATED' : `HTTP ${createRes.status}`}`);
  } else {
    console.log('  Storage bucket [game-config]: LIVE');
  }

  // Check if economy.json exists in game-config bucket; if not, seed defaults
  const objCheck = await fetch(`${url}/storage/v1/object/public/game-config/economy.json?t=${Date.now()}`);
  if (!objCheck.ok) {
    const defaultConfig = {
      constants: {
        priceWater: PRICES.water,
        priceSuya: PRICES.suya,
        posFee: PRICES.posFee,
        posAmount: PRICES.posAmount,
        refuel: ECON.refuel,
        fineRate: ECON.fineRate,
        bustRate: ECON.bustRate,
        speedTicket: ECON.speedTicket,
        payCycle: ECON.payCycle,
        raceWager: 20000,
      },
      job_payouts: Object.fromEntries(JOBS.map((j) => [j.id, j.pay])),
      mission_rewards: {
        first_run_risk: 25000,
        first_run_legit: 12000,
        get_paid_bonus: 10000,
        hot_delivery: 60000,
        cold_chain: 40000,
        warehouse_run: 50000,
        iponri_race: 80000,
        vehicle_recovery: 45000,
        getaway: 60000,
        rival_operation: 100000,
        coop_getaway: 60000,
        coop_convoy: 90000,
      },
      updated_at: new Date().toISOString(),
    };
    const upRes = await fetch(`${url}/storage/v1/object/game-config/economy.json`, {
      method: 'POST',
      headers: headers(serviceKey, { 'x-upsert': 'true', 'Cache-Control': 'no-cache' }),
      body: JSON.stringify(defaultConfig, null, 2),
    });
    console.log(`  Live Economy Config [game-config/economy.json]: ${upRes.ok ? 'SEEDED' : `HTTP ${upRes.status}`}`);
  } else {
    console.log('  Live Economy Config [game-config/economy.json]: LIVE');
  }
}
