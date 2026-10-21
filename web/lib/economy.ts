import { adminSupabase, supabaseUrl } from './supabase';

export type EconomyConstants = {
  priceWater: number;
  priceSuya: number;
  posFee: number;
  posAmount: number;
  refuel: number;
  fineRate: number;
  bustRate: number;
  speedTicket: number;
  payCycle: number;
  raceWager: number;
};

export type EconomyConfig = {
  constants: EconomyConstants;
  job_payouts: Record<string, number>;
  mission_rewards: Record<string, number>;
  updated_at?: string;
};

export const DEFAULT_CONSTANTS: EconomyConstants = {
  priceWater: 100,
  priceSuya: 1500,
  posFee: 200,
  posAmount: 20000,
  refuel: 3000,
  fineRate: 10000,
  bustRate: 15000,
  speedTicket: 2000,
  payCycle: 60,
  raceWager: 20000,
};

export const CONSTANT_META: { key: keyof EconomyConstants; label: string; unit: string }[] = [
  { key: 'priceWater', label: 'Pure Water Price', unit: '₦' },
  { key: 'priceSuya', label: 'Roadside Suya Price', unit: '₦' },
  { key: 'posFee', label: 'POS Withdrawal Fee', unit: '₦' },
  { key: 'posAmount', label: 'POS Withdrawal Amount', unit: '₦' },
  { key: 'refuel', label: 'Full Tank Refuel Cost', unit: '₦' },
  { key: 'fineRate', label: 'Police Fine per Heat Level', unit: '₦' },
  { key: 'bustRate', label: 'Arrest Bail per Heat Level', unit: '₦' },
  { key: 'speedTicket', label: 'FRSC / LASTMA Speed Ticket', unit: '₦' },
  { key: 'payCycle', label: 'Business Income Cycle', unit: 'sec' },
  { key: 'raceWager', label: 'Street Race Wager', unit: '₦' },
];

export const JOB_META: { id: string; title: string; where: string; defaultPay: number }[] = [
  { id: 'rider', title: 'Delivery Rider', where: 'Yaba Market', defaultPay: 8000 },
  { id: 'shop', title: 'Shop Assistant', where: 'Ojuelegba', defaultPay: 6000 },
  { id: 'guard', title: 'Security Guard', where: 'Iponri', defaultPay: 10000 },
  { id: 'mech', title: 'Mechanic Helper', where: 'Ladipo Garage', defaultPay: 9000 },
  { id: 'conductor', title: 'Danfo Conductor', where: 'Kilo Bus Stop', defaultPay: 7000 },
  { id: 'steward', title: 'Stadium Steward', where: 'National Stadium', defaultPay: 9500 },
  { id: 'porter', title: 'Market Porter', where: 'Shitta Market', defaultPay: 5000 },
  { id: 'posagent', title: 'POS Agent', where: 'Mushin Bus Stop', defaultPay: 12000 },
  { id: 'bouncer', title: 'Bouncer', where: 'Lust Club', defaultPay: 15000 },
  { id: 'courier', title: 'Island Courier', where: 'CMS, Lagos Island', defaultPay: 14000 },
  { id: 'tanker', title: 'Tanker Driver', where: 'Mobil Filling Station', defaultPay: 18000 },
  { id: 'lekki', title: 'Lekki Dispatch Rider', where: 'Lekki Toll Gate', defaultPay: 30000 },
  { id: 'yabarun', title: 'Campus Courier', where: 'Yaba College of Technology', defaultPay: 22000 },
  { id: 'ikorodu', title: 'Ikorodu Haulage', where: 'Ikorodu Garage', defaultPay: 35000 },
  { id: 'webdev', title: 'Web Freelancer', where: 'Cyber Café · Surulere', defaultPay: 28000 },
  { id: 'designer', title: 'Graphics Freelancer', where: 'Cyber Café · Surulere', defaultPay: 24000 },
  { id: 'coder', title: 'Junior Coder', where: 'Yaba · Tech errands', defaultPay: 35000 },
  { id: 'it-support', title: 'IT Support Technician', where: 'Alagomeji Tech Hub', defaultPay: 42000 },
  { id: 'lagoon_fisher', title: 'Lagoon Fishing Crew', where: 'Makoko Canoe Landing', defaultPay: 11000 },
  { id: 'fish_smoker', title: 'Smoked Fish & Jetty Run', where: 'Bariga Fishing Jetty', defaultPay: 10500 },
  { id: 'boat_charter', title: 'Lagoon Boat Skipper', where: 'Five Cowrie Creek Jetty', defaultPay: 16000 },
  { id: 'firefighter_shift', title: 'Fire & Rescue Auxiliary', where: 'Lagos State Fire Service', defaultPay: 14500 },
];

export const MISSION_META: { id: string; title: string; arc: string; defaultReward: number }[] = [
  { id: 'first_run_risk', title: 'Make the Delivery (Risk Path)', arc: 'Prologue', defaultReward: 25000 },
  { id: 'first_run_legit', title: 'Make the Delivery (Clean Path)', arc: 'Prologue', defaultReward: 12000 },
  { id: 'get_paid_bonus', title: 'Get Paid (Baba K Cash Bonus)', arc: 'Prologue', defaultReward: 10000 },
  { id: 'hot_delivery', title: 'Hot Delivery · Drop', arc: 'Prologue', defaultReward: 60000 },
  { id: 'cold_chain', title: 'Cold Chain', arc: 'Amaka (Legit)', defaultReward: 40000 },
  { id: 'warehouse_run', title: 'Warehouse Run', arc: 'Amaka (Legit)', defaultReward: 50000 },
  { id: 'iponri_race', title: 'The Iponri Race', arc: 'Amaka (Legit)', defaultReward: 80000 },
  { id: 'vehicle_recovery', title: 'Vehicle Recovery', arc: 'Baba K (Risk)', defaultReward: 45000 },
  { id: 'getaway', title: 'Getaway', arc: 'Baba K (Risk)', defaultReward: 60000 },
  { id: 'rival_operation', title: 'Rival Operation', arc: 'Baba K (Risk)', defaultReward: 100000 },
  { id: 'coop_getaway', title: 'Crew Co-op Getaway (Share)', arc: 'Crew Co-op', defaultReward: 60000 },
  { id: 'coop_convoy', title: 'Crew Co-op Convoy (Share)', arc: 'Crew Co-op', defaultReward: 90000 },
];

export function defaultEconomyConfig(): EconomyConfig {
  return {
    constants: { ...DEFAULT_CONSTANTS },
    job_payouts: Object.fromEntries(JOB_META.map((j) => [j.id, j.defaultPay])),
    mission_rewards: Object.fromEntries(MISSION_META.map((m) => [m.id, m.defaultReward])),
    updated_at: new Date().toISOString(),
  };
}

export function mergeEconomyConfig(raw?: Partial<EconomyConfig> | null): EconomyConfig {
  const base = defaultEconomyConfig();
  if (!raw) return base;
  if (raw.constants) {
    for (const { key } of CONSTANT_META) {
      const v = Number(raw.constants[key]);
      if (Number.isFinite(v) && v >= 0) base.constants[key] = v;
    }
  }
  if (raw.job_payouts) {
    for (const j of JOB_META) {
      const v = Number(raw.job_payouts[j.id]);
      if (Number.isFinite(v) && v >= 0) base.job_payouts[j.id] = v;
    }
  }
  if (raw.mission_rewards) {
    for (const m of MISSION_META) {
      const v = Number(raw.mission_rewards[m.id]);
      if (Number.isFinite(v) && v >= 0) base.mission_rewards[m.id] = v;
    }
  }
  if (raw.updated_at) base.updated_at = raw.updated_at;
  return base;
}

export async function loadEconomyConfig(): Promise<EconomyConfig> {
  const supabase = adminSupabase();
  if (supabase) {
    // 1. Try public.economy_config table first
    const { data, error } = await supabase
      .from('economy_config')
      .select('constants, job_payouts, mission_rewards, updated_at')
      .eq('id', 'default')
      .maybeSingle();
    if (!error && data) {
      return mergeEconomyConfig(data as Partial<EconomyConfig>);
    }
  }
  // 2. Fallback to Supabase Storage public bucket `game-config/economy.json`
  if (supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/public/game-config/economy.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as Partial<EconomyConfig>;
        return mergeEconomyConfig(json);
      }
    } catch {}
  }
  return defaultEconomyConfig();
}

export async function saveEconomyConfig(partial: Partial<EconomyConfig>): Promise<{ ok: boolean; error?: string; config: EconomyConfig }> {
  const current = await loadEconomyConfig();
  const merged = mergeEconomyConfig({
    constants: { ...current.constants, ...(partial.constants ?? {}) },
    job_payouts: { ...current.job_payouts, ...(partial.job_payouts ?? {}) },
    mission_rewards: { ...current.mission_rewards, ...(partial.mission_rewards ?? {}) },
    updated_at: new Date().toISOString(),
  });

  const supabase = adminSupabase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabase || !supabaseUrl || !serviceKey) {
    return { ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY on server', config: merged };
  }

  let savedSomewhere = false;
  let lastError = '';

  // 1. Upsert into public.economy_config if table is present
  const { error: tableErr } = await supabase.from('economy_config').upsert({
    id: 'default',
    constants: merged.constants,
    job_payouts: merged.job_payouts,
    mission_rewards: merged.mission_rewards,
    updated_at: merged.updated_at,
  });
  if (!tableErr) {
    savedSomewhere = true;
  } else {
    lastError = tableErr.message;
  }

  // 2. Also write to Supabase Storage `game-config/economy.json` so Unity and Web clients can always fetch it
  try {
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'game-config', name: 'game-config', public: true }),
    });
    const upRes = await fetch(`${supabaseUrl}/storage/v1/object/game-config/economy.json`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(merged, null, 2),
    });
    if (upRes.ok) savedSomewhere = true;
    else if (!lastError) lastError = `Storage HTTP ${upRes.status}`;
  } catch (err) {
    if (!lastError) lastError = err instanceof Error ? err.message : String(err);
  }

  return { ok: savedSomewhere, error: savedSomewhere ? undefined : lastError, config: merged };
}
