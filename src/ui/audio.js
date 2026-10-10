import { G } from '../core/context.js';
import { on } from '../core/events.js';

// Synthesised audio with the WebAudio API: engine hum, rain, generator during outages, horn on crash, cash chime.
// No audio files are needed. Starts on the first key or pointer input (browser autoplay rules).
let ctx, master, engine, engineGain, rainGain, genGain, started = false;

function noise(ac) { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; s.loop = true; return s; }
function layer(src, type, freq, gain) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = gain; src.connect(f).connect(g).connect(master); src.start(); return g; }

export function setupAudio() {
  const start = () => {
    if (started) return; started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = G.state.settings.audio === false ? 0 : 0.5; master.connect(ctx.destination);
    engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 55;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 400;
    engineGain = ctx.createGain(); engineGain.gain.value = 0; engine.connect(ef).connect(engineGain).connect(master); engine.start();
    rainGain = layer(noise(ctx), 'highpass', 1800, 0);
    genGain = layer(noise(ctx), 'bandpass', 120, 0);
    on('cash', () => chime());
    on('crash', () => horn());
  };
  addEventListener('keydown', start, { once: true }); addEventListener('pointerdown', start, { once: true });
  on('hud', () => { if (master) master.gain.value = G.state.settings.audio === false ? 0 : 0.5; });
}
function chime() { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); g.gain.setValueAtTime(0.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + 0.4); }
function horn() { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 180; g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + 0.5); }

export function updateAudio() {
  if (!ctx) return;
  const t = ctx.currentTime, kmh = G.inCar ? Math.abs(G.carSpeed) * 3.6 : 0;
  engine.frequency.setTargetAtTime(G.inCar ? 55 + kmh * 1.6 : 55, t, 0.1);
  engineGain.gain.setTargetAtTime(G.inCar ? 0.08 + Math.min(0.12, kmh / 600) : 0, t, 0.15);
  rainGain.gain.setTargetAtTime(G.rain ? 0.035 : 0, t, 0.5);
  genGain.gain.setTargetAtTime(G.outage ? 0.07 : 0, t, 0.5);
}
