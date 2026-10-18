import Link from 'next/link';

export const metadata = { title: 'Play — RISE Lagos' };

// The Three.js web edition was retired (tag `threejs-final`); the game is now the Unity edition in ../unity.
// This page stays so the landing page's Play links resolve; embed the Unity WebGL build here once it is hosted.
export default function PlayPage() {
  return (
    <main className="site" style={{ padding: '3rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>RISE — Lagos</h1>
      <p>The browser build is moving to the new engine and is not playable here yet.</p>
      <p><Link href="/account">Create an account</Link> now; your save will carry over when the game opens. · <Link href="/">Back home</Link></p>
    </main>
  );
}
