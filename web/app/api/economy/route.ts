import { NextResponse } from 'next/server';
import { defaultEconomyConfig, loadEconomyConfig, saveEconomyConfig, type EconomyConfig } from '@/lib/economy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await loadEconomyConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
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
