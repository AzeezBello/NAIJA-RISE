'use client';
import { useEffect, useRef } from 'react';

declare global { interface Window { __riseEngineStarted?: boolean } }

// Mounts the shared Three.js engine (../src) inside React. The engine owns its renderer and DOM HUD;
// React only provides the containers and lifecycle.
// The engine keeps its world, colliders and input listeners in module scope, so it can be created once per page load.
export default function GameCanvas() {
  const mount = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Returning to /play through client-side navigation (browser Back / Forward) would build a second world on top of
    // the first; start from a clean page instead.
    if (window.__riseEngineStarted) { window.location.reload(); return; }
    let cancelled = false;
    let game: { stop: () => void } | undefined;
    import('@engine/game.js').then(m => {
      // Unmounted (or React StrictMode's first dev pass was cleaned up) before the import finished: do not start.
      if (cancelled || !mount.current || !ui.current) return;
      window.__riseEngineStarted = true;
      game = m.createGame({ mount: mount.current, ui: ui.current });
    });
    return () => { cancelled = true; game?.stop(); };
  }, []);
  return (
    <div className="play">
      <div id="game" ref={mount} />
      <div id="ui" ref={ui} />
    </div>
  );
}
