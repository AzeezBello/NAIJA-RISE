'use client';
import dynamic from 'next/dynamic';

// The engine touches window/document, so it only loads on the client.
const GameCanvas = dynamic(() => import('./GameCanvas'), {
  ssr: false,
  loading: () => <div className="play" style={{ display: 'grid', placeItems: 'center', color: '#93a39c' }}>Loading Lagos…</div>,
});

export default function PlayClient() { return <GameCanvas />; }
