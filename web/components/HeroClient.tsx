'use client';
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

const Fallback = ({ label = 'Loading 3D…' }: { label?: string }) => (
  <div
    style={{
      height: '100%',
      display: 'grid',
      placeItems: 'center',
      color: '#93a39c',
      background: 'radial-gradient(circle at 50% 40%, #143f2b 0%, #07100e 75%)',
      fontSize: 12,
      letterSpacing: '.12em',
      fontWeight: 800,
    }}
  >
    {label}
  </div>
);

// WebGL only exists in the browser, so the React Three Fiber hero is client-only.
const Hero = dynamic(() => import('./Hero'), {
  ssr: false,
  loading: () => <Fallback />,
});

class HeroErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <Fallback label="SURULERE // 3D PREVIEW" />;
    return this.props.children;
  }
}

export default function HeroClient() {
  return (
    <HeroErrorBoundary>
      <Hero />
    </HeroErrorBoundary>
  );
}
