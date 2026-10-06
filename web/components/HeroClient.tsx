'use client';
import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the React Three Fiber hero is client-only.
const Hero = dynamic(() => import('./Hero'), { ssr: false, loading: () => <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#93a39c' }}>Loading 3D…</div> });
export default function HeroClient() { return <Hero />; }
