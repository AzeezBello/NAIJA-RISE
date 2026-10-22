import Link from 'next/link';

export const metadata = { title: 'Play — Rise: Hustle or Die Trying' };
export const dynamic = 'force-dynamic';

const ITCH_PAGE_URL = 'https://demolablaze.itch.io/rise';
const DEFAULT_HTML_URL = 'https://html-classic.itch.zone/html/19929265/index.html';

function parseRawEmbedUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept either a direct embed URL or a full itch.io <iframe ... src="..."> snippet.
  const match = trimmed.match(/src=["']([^"']+)["']/i);
  const url = (match ? match[1] : trimmed).trim();
  if (!url) return null;
  return url.startsWith('//') ? `https:${url}` : url;
}

function extractUploadId(url: string): string | null {
  const m = url.match(/(?:embed-upload|html)\/(\d+)/i);
  return m ? m[1] : null;
}

async function resolveLiveWebglUrl(raw?: string): Promise<string> {
  const configured = parseRawEmbedUrl(raw);

  // If a custom non-itch URL is configured (e.g. self-hosted CDN), use it directly.
  if (configured && !/itch\.(?:io|zone)/i.test(configured)) {
    return configured;
  }

  // Discover the currently active HTML5 upload directly from demolablaze.itch.io/rise so that
  // stale/replaced upload IDs (such as 19852219) never get stuck on "Loading game for the first time...".
  try {
    const res = await fetch(ITCH_PAGE_URL, {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 60 },
      headers: { 'User-Agent': 'RiseLagosWeb/1.0' },
    });
    if (res.ok) {
      const html = await res.text();
      const directMatch = html.match(/https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html(?:\?v=\d+)?/i);
      if (directMatch) {
        return directMatch[0];
      }
    }
  } catch {
    // Fall through to configured/default URL if itch.io page lookup times out.
  }

  if (configured) {
    const uploadId = extractUploadId(configured);
    // Replace known retired upload ID 19852219 or convert embed-upload wrapper to direct HTML5 bundle URL.
    if (uploadId && uploadId !== '19852219') {
      return `https://html-classic.itch.zone/html/${uploadId}/index.html`;
    }
  }

  return DEFAULT_HTML_URL;
}

export default async function PlayPage() {
  const embedUrl = await resolveLiveWebglUrl(process.env.NEXT_PUBLIC_WEBGL_URL || process.env.WEBGL_URL);

  return (
    <main className="site play-shell">
      <header className="play-header">
        <div className="play-brand-group">
          <Link href="/" className="site-logo" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>
            <b>RISE</b>: HUSTLE OR DIE TRYING
          </Link>
          <span className="play-brand-sub">
            <span className="site-status-dot" />
            LAGOS // SURULERE
          </span>
        </div>

        <div className="play-controls-hint">
          WASD MOVE · SHIFT SPRINT · E INTERACT · F / CLICK FIGHT · G PICK ITEM · Q WEAPON · TAB PHONE
        </div>

        <nav className="play-nav">
          <Link href="/account" className="play-nav-link">
            ACCOUNT
          </Link>
          {embedUrl && (
            <a
              href={embedUrl}
              target="_blank"
              rel="noreferrer"
              className="play-nav-fullscreen"
            >
              FULLSCREEN ↗
            </a>
          )}
          <Link href="/" className="play-nav-link">
            EXIT
          </Link>
        </nav>
      </header>

      <div className="play-stage">
        <iframe
          src={embedUrl}
          title="Rise: Hustle or Die Trying (Unity WebGL)"
          allow="autoplay; fullscreen *; gamepad; pointer-lock; accelerometer; gyroscope; cross-origin-isolated"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            background: '#07100e',
          }}
        />
      </div>
    </main>
  );
}
