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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [save, setSave] = useState<SaveRow | null>(null);
  const [status, setStatus] = useState(
    cloudEnabled ? '' : 'Offline: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null)
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      setSave(null);
      return;
    }
    supabase
      .from('saves')
      .select('slot, updated_at, state')
      .eq('user_id', user.id)
      .eq('slot', 'main')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setStatus(error.message);
        setSave((data as SaveRow | null) ?? null);
      });
  }, [supabase, user]);

  async function signIn() {
    if (!supabase || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setStatus(error ? error.message : 'Signed in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function signUp() {
    if (!supabase || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setStatus(
        error
          ? error.message
          : data.session
          ? 'Account created.'
          : 'Check your email to confirm the account.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setStatus('Signed out.');
  }

  const state = save?.state as { cash?: number; bank?: number; level?: number; day?: number } | undefined;

  return (
    <main className="site account-shell">
      <header className="site-header">
        <Link href="/" className="site-logo">
          <b>RISE</b>: HUSTLE OR DIE TRYING
        </Link>
        <div className="site-status">
          <span className="site-status-dot" />
          <span>CLOUD PROFILE</span>
          <i />
          <span>LAGOS</span>
        </div>
        <nav className="site-nav">
          <Link href="/">Home</Link>
          <Link href="/play" className="nav-play">
            PLAY
            <span>→</span>
          </Link>
        </nav>
      </header>

      <div className="account-container">
        <div className="account-card">
          <div className="account-kicker">
            <span className="site-status-dot" />
            CROSS-PLATFORM CLOUD SAVE
          </div>
          <h1 className="account-title">Account</h1>
          <p className="account-subtitle">
            Sign in to sync your Lagos hustle, cash, properties, and reputation between browser and desktop builds.
          </p>

          {!user ? (
            <form
              className="account-form"
              method="post"
              onSubmit={e => {
                e.preventDefault();
                void signIn();
              }}
            >
              <div className="account-field">
                <label htmlFor="account-email" className="account-label">
                  Email address
                </label>
                <input
                  id="account-email"
                  name="email"
                  type="email"
                  className="account-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  disabled={!cloudEnabled || submitting}
                />
              </div>

              <div className="account-field">
                <div className="account-label-row">
                  <label htmlFor="account-password" className="account-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="account-pw-toggle"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <input
                  id="account-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="account-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="current-password"
                  enterKeyHint="done"
                  aria-describedby="password-constraints"
                  required
                  minLength={6}
                  disabled={!cloudEnabled || submitting}
                />
                <span id="password-constraints" className="account-hint">
                  Minimum 6 characters.
                </span>
              </div>

              <div className="account-actions">
                <button
                  type="submit"
                  className="account-btn-primary"
                  disabled={!cloudEnabled || submitting}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
                <button
                  type="button"
                  className="account-btn-secondary"
                  onClick={() => void signUp()}
                  disabled={!cloudEnabled || submitting}
                >
                  Create account
                </button>
              </div>
            </form>
          ) : (
            <section className="account-profile">
              <div className="account-user-banner">
                <span className="account-user-label">SIGNED IN AS</span>
                <strong>{user.email}</strong>
              </div>

              {state ? (
                <div className="account-save-grid">
                  <div className="account-stat">
                    <span>DAY</span>
                    <strong>{state.day ?? 1}</strong>
                  </div>
                  <div className="account-stat">
                    <span>LEVEL</span>
                    <strong>{state.level ?? 1}</strong>
                  </div>
                  <div className="account-stat">
                    <span>CASH</span>
                    <strong>₦{(state.cash ?? 0).toLocaleString()}</strong>
                  </div>
                  <div className="account-stat">
                    <span>BANK</span>
                    <strong>₦{(state.bank ?? 0).toLocaleString()}</strong>
                  </div>
                  <p className="account-save-updated">
                    Last synced {new Date(save!.updated_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="account-empty-save">
                  No cloud save yet. Launch Rise: Hustle or Die Trying while signed in to sync your progress to the cloud.
                </p>
              )}

              <div className="account-actions">
                <Link href="/play" className="account-btn-primary">
                  Launch Game →
                </Link>
                <button type="button" className="account-btn-secondary" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </section>
          )}

          {status && (
            <p role="status" aria-live="polite" className="account-status">
              {status}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
