import Link from 'next/link';
import Hero from '@/components/HeroClient';

const FEATURES = [
  ['Surulere, Lagos', 'Ojuelegba, Kilo, Shitta, Yaba Market, the National Stadium, Rita Lori, Forties Bar and more.'],
  ['Danfo, keke, okada, BRT', 'Drive the real Lagos fleet through traffic, go-slows and FRSC checkpoints.'],
  ['Hustle and build', 'Jobs, businesses, property, bank, phone. Rise from Newcomer to Mogul.'],
  ['Heat and consequences', 'Agberos, police pursuit, LASTMA, owambe nights and NEPA outages.'],
];

export default function Home() {
  return (
    <main className="site">
      <header>
        <div className="logo">NAIJA <b>RISE</b></div>
        <nav><Link href="/play">Play</Link><a href="https://github.com" target="_blank" rel="noreferrer">Roadmap</a></nav>
      </header>
      <section className="hero">
        <div>
          <h1>NAIJA <b>RISE</b><br />Lagos</h1>
          <p>Build your life. Build your empire. Survive the city. An original open-world life simulation set in a living Surulere — playable in the browser, on phone, with keyboard, touch or controller.</p>
          <div className="cta">
            <Link href="/play" className="btn big">Play Alpha 0.7</Link>
            <Link href="/play#play" className="btn big ghost">Skip title screen</Link>
          </div>
        </div>
        <div className="canvas"><Hero /></div>
      </section>
      <section className="features">
        {FEATURES.map(([t, d]) => <div className="card" key={t}><h6>{t}</h6><p>{d}</p></div>)}
      </section>
    </main>
  );
}
