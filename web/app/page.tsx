import Link from 'next/link';
import Hero from '@/components/HeroClient';

const FEATURES = [
  {
    number: '01',
    title: 'LIVE LAGOS',
    text: 'Explore a living Surulere filled with roads, markets, neighbourhoods, businesses, traffic and everyday Lagos life.',
  },
  {
    number: '02',
    title: 'HUSTLE',
    text: 'Find work, earn money, learn skills, build your reputation and discover opportunities across the city.',
  },
  {
    number: '03',
    title: 'BUILD YOUR LIFE',
    text: 'Develop relationships, manage your money, own property, get vehicles and decide what kind of person you become.',
  },
  {
    number: '04',
    title: 'RISE',
    text: 'Start as a newcomer and build your way toward influence, wealth, respect and your own place in Lagos.',
  },
];

const CITY_ITEMS = [
  'SURULERE',
  'OJUELEGBA',
  'SHITTA',
  'KILO',
  'YABA',
  'NATIONAL STADIUM',
];

export default function Home() {
  return (
    <main className="site">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="site-header">

        <Link href="/" className="site-logo">
          NAIJA <b>RISE</b>
        </Link>

        <div className="site-status">
          <span className="site-status-dot" />
          <span>LAGOS</span>
          <i />
          <span>ALPHA</span>
        </div>

        <nav className="site-nav">
          <a href="#world">World</a>
          <a href="#features">Features</a>
          <Link href="/play" className="nav-play">
            PLAY
            <span>→</span>
          </Link>
        </nav>

      </header>


      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="landing-hero">

        <div className="hero-grid" />
        <div className="hero-glow" />

        <div className="hero-copy">

          <div className="hero-kicker">
            <span className="hero-live-dot" />
            NAIJA RISE WORLD
            <i />
            LAGOS, NIGERIA
          </div>

          <h1>
            NAIJA
            <b>RISE</b>
          </h1>

          <div className="hero-location">
            LAGOS
            <span>01</span>
          </div>

          <div className="hero-rule" />

          <p className="hero-tagline">
            YOUR LIFE.
            <br />
            <strong>YOUR HUSTLE.</strong>
            <br />
            YOUR LAGOS.
          </p>

          <p className="hero-description">
            Step into an evolving open-world life simulation set in
            Lagos. Explore the streets, meet people, find opportunities,
            make money, build relationships and create your own story.
          </p>

          <div className="hero-actions">

            <Link
              href="/play"
              className="landing-play"
            >
              <span className="play-number">01</span>

              <span className="play-copy">
                <strong>ENTER LAGOS</strong>
                <small>START YOUR JOURNEY</small>
              </span>

              <span className="play-arrow">→</span>
            </Link>

            <Link
              href="/play#play"
              className="landing-secondary"
            >
              QUICK PLAY
            </Link>

          </div>

          <div className="hero-controls">
            <span>KEYBOARD</span>
            <i />
            <span>TOUCH</span>
            <i />
            <span>DUALSENSE</span>
            <i />
            <span>CONTROLLER</span>
          </div>

        </div>


        {/* ===================================================
            LIVE GAME PREVIEW
            =================================================== */}

        <div className="hero-preview">

          <div className="preview-frame">

            <div className="preview-top">
              <span>LIVE WORLD PREVIEW</span>
              <span>
                <i />
                ONLINE
              </span>
            </div>

            <div className="preview-canvas">
              <Hero />

              <div className="preview-overlay" />

              <div className="preview-location">
                <small>CURRENT DISTRICT</small>
                <strong>SURULERE</strong>
                <span>LAGOS</span>
              </div>

              <div className="preview-coordinates">
                NR // 01
              </div>

            </div>

            <div className="preview-bottom">

              <div>
                <small>WORLD</small>
                <strong>LAGOS</strong>
              </div>

              <div>
                <small>DISTRICT</small>
                <strong>SURULERE</strong>
              </div>

              <div>
                <small>BUILD</small>
                <strong>ALPHA</strong>
              </div>

              <div>
                <small>STATUS</small>
                <strong>PLAYABLE</strong>
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          WORLD STRIP
          ===================================================== */}

      <section
        id="world"
        className="world-strip"
      >

        <div className="world-label">
          <span>THE CITY</span>
          <strong>01</strong>
        </div>

        <div className="world-scroll">

          {CITY_ITEMS.map((item, index) => (
            <span key={item}>
              {item}
              {index !== CITY_ITEMS.length - 1 && (
                <i>•</i>
              )}
            </span>
          ))}

        </div>

      </section>


      {/* =====================================================
          FEATURES
          ===================================================== */}

      <section
        id="features"
        className="landing-features"
      >

        <div className="section-heading">

          <div>
            <span>THE EXPERIENCE</span>

            <h2>
              BUILD A LIFE.
              <br />
              <b>RISE IN LAGOS.</b>
            </h2>
          </div>

          <p>
            NAIJA RISE is more than a driving game.
            It is a life simulation where your decisions,
            relationships, hustle and reputation shape
            the world around you.
          </p>

        </div>


        <div className="feature-grid">

          {FEATURES.map(feature => (
            <article
              className="landing-feature"
              key={feature.number}
            >

              <div className="feature-number">
                {feature.number}
              </div>

              <div className="feature-content">

                <h3>
                  {feature.title}
                </h3>

                <p>
                  {feature.text}
                </p>

              </div>

              <span className="feature-arrow">
                ↗
              </span>

            </article>
          ))}

        </div>

      </section>


      {/* =====================================================
          CTA
          ===================================================== */}

      <section className="final-cta">

        <div className="final-grid" />

        <div className="final-content">

          <span>THE CITY IS WAITING</span>

          <h2>
            READY TO
            <b>RISE?</b>
          </h2>

          <p>
            Your story starts in Lagos.
          </p>

          <Link
            href="/play"
            className="final-play"
          >
            <span>PLAY NAIJA RISE</span>
            <b>→</b>
          </Link>

        </div>

        <div className="final-corner">
          NR // LAGOS // 01
        </div>

      </section>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="site-footer">

        <div className="footer-brand">
          NAIJA <b>RISE</b>
        </div>

        <div className="footer-copy">
          LAGOS OPEN-WORLD LIFE SIMULATION
        </div>

        <div className="footer-version">
          ALPHA 1.0
        </div>

      </footer>

    </main>
  );
}