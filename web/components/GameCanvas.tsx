'use client';
import { useEffect, useRef } from 'react';

// Mounts the shared Three.js engine (../src) inside React. The engine owns its renderer and DOM HUD;
// React only provides the containers and lifecycle.
export default function GameCanvas() {
  const mount = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let game: { stop: () => void } | undefined;
    import('@engine/game.js').then(m => { if (mount.current && ui.current) game = m.createGame({ mount: mount.current, ui: ui.current }); });
    return () => game?.stop();
  }, []);
  return (
    <div className="play">
      <div id="game" ref={mount} />
      <div id="ui" ref={ui} />
    </div>
  );
}
