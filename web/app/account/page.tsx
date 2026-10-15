'use client';
// Account screen (PLAN Phase 6): sign up and in with Supabase Auth, see the cloud save, sign out. The Unity edition
// uses the same tables, so a player signed in here resumes the same save there.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserSupabase, cloudEnabled } from '@/lib/supabase';

type SaveRow = { slot: string; updated_at: string; state: Record<string, unknown> };

export default function AccountPage() {
  const supabase = browserSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [save, setSave] = useState<SaveRow | null>(null);
  const [status, setStatus] = useState(cloudEnabled ? '' : 'Offline: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ? { id: session.user.id, email: session.user.email } : null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) { setSave(null); return; }
    supabase.from('saves').select('slot, updated_at, state').eq('user_id', user.id).eq('slot', 'main').maybeSingle()
      .then(({ data, error }) => { if (error) setStatus(error.message); setSave((data as SaveRow | null) ?? null); });
  }, [supabase, user]);

  async function signIn() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setStatus(error ? error.message : 'Signed in.');
  }
  async function signUp() {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({ email, password });
    setStatus(error ? error.message : data.session ? 'Account created.' : 'Check your email to confirm the account.');
  }
  async function signOut() { await supabase?.auth.signOut(); setStatus('Signed out.'); }

  const state = save?.state as { cash?: number; bank?: number; level?: number; day?: number } | undefined;

  return (
    <main className="site" style={{ padding: '3rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <p><Link href="/">← RISE</Link></p>
      <h1>Account</h1>
      {!user ? (
        <form onSubmit={e => { e.preventDefault(); void signIn(); }} style={{ display: 'grid', gap: '0.75rem' }}>
          <label>Email <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!cloudEnabled} /></label>
          <label>Password <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={!cloudEnabled} /></label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" disabled={!cloudEnabled}>Sign in</button>
            <button type="button" onClick={() => void signUp()} disabled={!cloudEnabled}>Create account</button>
          </div>
        </form>
      ) : (
        <section style={{ display: 'grid', gap: '0.75rem' }}>
          <p>Signed in as <strong>{user.email}</strong>.</p>
          {state ? (
            <p>Cloud save · Day {state.day ?? 1} · Level {state.level ?? 1} · ₦{(state.cash ?? 0).toLocaleString()} cash · ₦{(state.bank ?? 0).toLocaleString()} bank · updated {new Date(save!.updated_at).toLocaleString()}</p>
          ) : (
            <p>No cloud save yet. Play in the Unity edition signed in, or wait for the web edition's sync.</p>
          )}
          <p><Link href="/play">Play</Link> · <button type="button" onClick={() => void signOut()}>Sign out</button></p>
        </section>
      )}
      {status && <p role="status">{status}</p>}
    </main>
  );
}
