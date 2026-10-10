import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { G } from './context.js';
import { PERF } from '../data/config.js';

// Natural look with a light touch: HDR render → soft bloom on neon and street lights (mostly at night) → neutral grade
// (split toning and saturation off, faint vignette) → tone mapping + sRGB output.
// An environment map gives car paint, glass and wet asphalt something to reflect. Off on the low-end profile
// unless the player turns "Cinematic look" on in Settings.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.08 }, split: { value: 0 }, sat: { value: 1 }, contrast: { value: 1 }, warm: { value: new THREE.Color(1.0, 0.84, 0.64) }, cool: { value: new THREE.Color(0.62, 0.8, 1.0) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette, split, sat, contrast; uniform vec3 warm, cool; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb; float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, col * mix(cool, warm, smoothstep(0.1, 0.9, l)), split);
      col = mix(vec3(l), col, sat);
      col = (col - 0.5) * contrast + 0.5;
      float d = distance(vUv, vec2(0.5)); col *= 1.0 - vignette * smoothstep(0.3, 0.95, d);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

import { current } from './quality.js';
// Cinematic look runs only when the quality level allows it; the Settings toggle can switch it off at any level.
export const fxEnabled = () => {
  const setting = G.state?.settings?.fx;
  return setting === undefined ? current().fx : setting;
};

export function setupPostFx() {
  const { renderer, scene, camera } = G;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4; pmrem.dispose();
  const half = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float'));
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: PERF.lowEnd ? 0 : 2 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.55, 0.88);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(bloom); composer.addPass(grade); composer.addPass(new OutputPass());
  Object.assign(G, { composer, bloom, grade });
  addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));
}

export function renderFrame() {
  if (G.composer && fxEnabled()) G.composer.render(); else G.renderer.render(G.scene, G.camera);
}
