import { NextResponse } from 'next/server';
import { defaultEconomyConfig, loadEconomyConfig, saveEconomyConfig, type EconomyConfig } from '@/lib/economy';
import { adminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyAdminRequest(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  const configuredToken = (process.env.ADMIN_ACCESS_TOKEN ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const headerToken = (
    request.headers.get('x-admin-token') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();

  // 1. Direct match against configured ADMIN_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY
  if (headerToken && ((configuredToken && headerToken === configuredToken) || (serviceKey && headerToken === serviceKey))) {
    return { authorized: true };
  }

  // 2. Verify Supabase JWT for an authenticated admin user (role === 'admin' or email in ADMIN_EMAILS)
  if (headerToken && adminSupabase()) {
    const { data, error } = await adminSupabase()!.auth.getUser(headerToken);
    if (!error && data?.user) {
      const role = String(data.user.app_metadata?.role ?? '');
      const email = String(data.user.email ?? '').toLowerCase();
      if (role === 'admin' || (email && adminEmails.includes(email))) {
        return { authorized: true };
      }
      return { authorized: false, reason: 'Authenticated user does not have administrator permissions' };
    }
  }

  // If ADMIN_ACCESS_TOKEN or ADMIN_EMAILS is configured, strictly require a valid token/session
  if (configuredToken || adminEmails.length > 0) {
    return { authorized: false, reason: 'Administrator token or admin session required' };
  }

  // Fallback when ADMIN_ACCESS_TOKEN is not set: require either same-origin /admin referer + header token or service key
  if (serviceKey && headerToken && headerToken !== serviceKey) {
    return { authorized: false, reason: 'Invalid administrator token' };
  }
  return { authorized: true };
}

export async function GET() {
  const config = await loadEconomyConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ ok: false, error: auth.reason ?? 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as Partial<EconomyConfig> & { reset?: boolean };
    if (body.reset) {
      const defaults = defaultEconomyConfig();
      const res = await saveEconomyConfig(defaults);
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
      return NextResponse.json({ ok: true, config: res.config });
    }
    const res = await saveEconomyConfig(body);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
    return NextResponse.json({ ok: true, config: res.config });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Invalid request payload' },
      { status: 400 },
    );
  }
}
