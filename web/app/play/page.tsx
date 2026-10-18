import Link from 'next/link';

export const metadata = { title: 'Play — RISE Lagos' };
export const dynamic = 'force-dynamic';

function resolveEmbedUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept either a direct embed URL or a full itch.io <iframe ... src="..."> snippet.
  const match = trimmed.match(/src=["']([^"']+)["']/i);
  const url = (match ? match[1] : trimmed).trim();
  if (!url) return null;
  return url.startsWith('//') ? `https:${url}` : url;
}

export default function PlayPage() {
  const embedUrl = resolveEmbedUrl(process.env.NEXT_PUBLIC_WEBGL_URL || process.env.WEBGL_URL);

  return (
    <main
      className="site"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#050b09',
      }}
    >
      <header
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(5,11,9,0.94)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" className="site-logo" style={{ fontSize: 18 }}>
            <b>RISE</b>
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.16em',
              color: '#81908a',
            }}
          >
            <span className="site-status-dot" />
            LAGOS // SURULERE
          </span>
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '.12em',
            color: '#697870',
          }}
        >
          WASD MOVE · SHIFT SPRINT · E TALK / VEHICLE · SPACE JUMP · TAB MAP
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/account"
            style={{
              color: '#aab5b0',
              textDecoration: 'none',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.14em',
            }}
          >
            ACCOUNT
          </Link>
          {embedUrl && (
            <a
              href={embedUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#07100e',
                background: 'var(--landing-green)',
                textDecoration: 'none',
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: '.12em',
                padding: '6px 10px',
                borderRadius: 5,
              }}
            >
              FULLSCREEN ↗
            </a>
          )}
          <Link
            href="/"
            style={{
              color: '#aab5b0',
              textDecoration: 'none',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '.14em',
            }}
          >
            EXIT
          </Link>
        </nav>
      </header>

      {embedUrl ? (
        <div style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100vh - 44px)' }}>
          <iframe
            src={embedUrl}
            title="RISE — Lagos (Unity WebGL)"
            allow="autoplay; fullscreen *; gamepad; pointer-lock; accelerometer; gyroscope"
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
      ) : (
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            padding: '2rem 1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 620,
              width: '100%',
              padding: '28px 30px',
              background: 'rgba(7,16,14,0.88)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '.18em',
                color: 'var(--landing-green)',
                marginBottom: 8,
              }}
            >
              WEBGL HOST CONFIGURATION
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: 28, letterSpacing: '-.04em' }}>
              RISE — Lagos
            </h1>
            <p style={{ fontSize: 13, color: '#b7c4be', lineHeight: 1.6, margin: '0 0 18px' }}>
              Set <code style={{ color: '#fff' }}>NEXT_PUBLIC_WEBGL_URL</code> to your hosted itch.io HTML5 embed URL to stream the Unity WebGL build right here.
            </p>
            <ol
              style={{
                margin: '0 0 20px',
                paddingLeft: 18,
                fontSize: 12,
                color: '#9ba9a3',
                lineHeight: 1.75,
              }}
            >
              <li>
                Package the WebGL build with <code style={{ color: '#e3ece8' }}>npm run package:webgl</code> to produce{' '}
                <code style={{ color: '#e3ece8' }}>unity/Builds/Rise-Lagos-WebGL.zip</code>.
              </li>
              <li>
                On <strong>itch.io → Create new project</strong>, set <em>Kind of project</em> to <strong>HTML</strong>, upload{' '}
                <code style={{ color: '#e3ece8' }}>Rise-Lagos-WebGL.zip</code>, and check <em>This file will be played in the browser</em>.
              </li>
              <li>
                Open the project&apos;s <strong>Embed game → Direct link / Embed HTML</strong>, copy the{' '}
                <code style={{ color: '#e3ece8' }}>https://itch.io/embed-upload/...</code> URL (or full{' '}
                <code style={{ color: '#e3ece8' }}>&lt;iframe&gt;</code> tag), and set it as{' '}
                <code style={{ color: '#e3ece8' }}>NEXT_PUBLIC_WEBGL_URL</code> in Render (or <code style={{ color: '#e3ece8' }}>web/.env.local</code>).
              </li>
            </ol>
            <p style={{ fontSize: 12, color: '#9ba9a3', margin: 0 }}>
              <Link href="/account" style={{ color: 'var(--landing-green)' }}>
                Create an account
              </Link>{' '}
              ·{' '}
              <Link href="/" style={{ color: '#dfe8e3' }}>
                Back home
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
