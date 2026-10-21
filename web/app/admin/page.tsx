// Admin dashboard (PLAN Phase 6): players, saves, economy totals, and live editing of job payouts, mission rewards,
// and economy constants in Supabase without a client rebuild.
import Link from 'next/link';
import { adminSupabase } from '@/lib/supabase';
import { loadEconomyConfig } from '@/lib/economy';
import EconomyEditor from './EconomyEditor';

export const dynamic = 'force-dynamic';

type Overview = { players: number; saves: number; total_naira: number; avg_level: number; crews: number };
type PlayerRow = { user_id: string; display_name: string; last_seen: string };
type SaveRow = { user_id: string; updated_at: string; state: { cash?: number; bank?: number; level?: number; day?: number; mission?: number } };

export default async function AdminPage() {
  const supabase = adminSupabase();
  if (!supabase) {
    return (
      <main className="site" style={{ padding: '3rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
        <p><Link href="/">← Rise: Hustle or Die Trying</Link></p>
        <h1>Admin</h1>
        <p>Offline: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.</p>
      </main>
    );
  }
  const [{ data: overview }, { data: players }, { data: saves }, economyConfig] = await Promise.all([
    supabase.from('admin_overview').select('*').maybeSingle(),
    supabase.from('players').select('user_id, display_name, last_seen').order('last_seen', { ascending: false }).limit(50),
    supabase.from('saves').select('user_id, updated_at, state').order('updated_at', { ascending: false }).limit(50),
    loadEconomyConfig(),
  ]);
  const o = (overview ?? { players: 0, saves: 0, total_naira: 0, avg_level: 0, crews: 0 }) as Overview;
  const saveByUser = new Map((saves as SaveRow[] | null ?? []).map(s => [s.user_id, s]));

  return (
    <main className="site" style={{ padding: '3rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <p><Link href="/">← Rise: Hustle or Die Trying</Link></p>
      <h1>Admin Dashboard</h1>
      <p>{o.players} players · {o.saves} saves · ₦{Number(o.total_naira).toLocaleString()} in the economy · average level {Number(o.avg_level).toFixed(1)} · {o.crews} crews</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Player</th><th align="left">Last seen</th><th align="right">Day</th><th align="right">Level</th><th align="right">Mission</th><th align="right">Cash</th><th align="right">Bank</th></tr></thead>
        <tbody>
          {(players as PlayerRow[] | null ?? []).map(p => {
            const s = saveByUser.get(p.user_id)?.state ?? {};
            return (
              <tr key={p.user_id}>
                <td>{p.display_name} <small>{p.user_id.slice(0, 8)}</small></td>
                <td>{new Date(p.last_seen).toLocaleString()}</td>
                <td align="right">{s.day ?? '—'}</td><td align="right">{s.level ?? '—'}</td><td align="right">{s.mission ?? '—'}</td>
                <td align="right">{s.cash != null ? `₦${s.cash.toLocaleString()}` : '—'}</td><td align="right">{s.bank != null ? `₦${s.bank.toLocaleString()}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <EconomyEditor initial={economyConfig} />
    </main>
  );
}
