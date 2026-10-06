import dynamic from 'next/dynamic';

// The engine touches window/document, so it only loads on the client.
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false, loading: () => <div className="play" style={{ display: 'grid', placeItems: 'center', color: '#93a39c' }}>Loading Lagos…</div> });

export const metadata = { title: 'Play — NAIJA RISE Lagos' };

export default function PlayPage() { return <GameCanvas />; }
