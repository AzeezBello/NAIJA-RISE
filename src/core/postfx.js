import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { G } from './context.js';
import { current } from './quality.js';

// Natural look with a light touch: HDR render → soft bloom on neon and street lights (skipped by day) → tone mapping
// + sRGB output (OutputPass) → FXAA on the Medium tier. High uses 2× MSAA on the HDR target instead of FXAA.
// An environment map gives car paint, glass and wet asphalt something to reflect.
//
// The composer is built lazily and freed when the "Cinematic look" is off (Low tier, or switched off in Settings), so
// phones that never use it do not pay for two full-resolution half-float targets plus the bloom mip chain.
// The old colour-grade pass was removed: split toning, saturation and contrast were fixed at no-op values and the
// 8 % vignette is already covered by the CSS `.fade` overlay in the HUD.

// Cinematic look runs only when the quality level allows it; the Settings toggle can switch it off at any level.
export const fxEnabled = () => {
  const setting = G.state?.settings?.fx;
  return setting === undefined ? current().fx : setting;
};

const FX_OFF_FRAMES = 180;   // keep the composer ~3 s after fx turns off so a quality flap does not rebuild it
let offFrames = 0, builtKey = -1, fxaaW = 0, fxaaH = 0, fxaaPR = 0;
const fxKey = q => (q.msaa | 0) * 2 + (q.fxaa ? 1 : 0);   // composer layout that depends on the quality tier

function halfFloatSupported(renderer) {
  return renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float'));
}

function buildComposer() {
  const { renderer, camera } = G, q = current();
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
    type: halfFloatSupported(renderer) ? THREE.HalfFloatType : THREE.UnsignedByteType,   // 8-bit fallback where half-float buffers are missing
    samples: q.msaa | 0,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());   // resizes the targets to the current (dynamic) resolution
  // G.scene, not the scene captured at startup: the composer may be (re)built while the player is inside an interior.
  composer.addPass(new RenderPass(G.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.15, 0.35, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let fxaa = null;
  if (q.fxaa) { fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa); }   // after OutputPass: FXAA wants display-referred colour
  Object.assign(G, { composer, bloom, fxaa });
  builtKey = fxKey(q); fxaaW = fxaaH = fxaaPR = 0;
}

function disposeComposer() {
  const c = G.composer;
  if (!c) return;
  for (const p of c.passes) p.dispose?.();
  c.dispose();
  G.composer = G.bloom = G.fxaa = null; builtKey = -1;
}

// daynight.js publishes the wanted bloom look in G.bloomTarget (it cannot touch a pass that may not exist yet).
function syncBloom() {
  const b = G.bloom, t = G.bloomTarget;
  if (!b || !t) return;
  b.strength = t.strength; b.radius = t.radius; b.threshold = t.threshold; b.enabled = t.enabled;
}

function syncFxaa() {
  const f = G.fxaa;
  if (!f) return;
  const pr = G.renderer.getPixelRatio();
  if (fxaaPR === pr && fxaaW === innerWidth && fxaaH === innerHeight) return;
  fxaaPR = pr; fxaaW = innerWidth; fxaaH = innerHeight;
  f.material.uniforms.resolution.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr));
}

export function setupPostFx() {
  const { renderer, scene } = G;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4; pmrem.dispose();
  addEventListener('resize', () => G.composer?.setSize(innerWidth, innerHeight));
}

export function renderFrame() {
  if (!fxEnabled()) {
    if (G.composer && ++offFrames > FX_OFF_FRAMES) disposeComposer();
    G.renderer.render(G.scene, G.camera);
    return;
  }
  offFrames = 0;
  if (G.composer && builtKey !== fxKey(current())) disposeComposer();   // MSAA / FXAA changed with the quality tier
  if (!G.composer) buildComposer();
  syncBloom(); syncFxaa();
  G.composer.render();
}
