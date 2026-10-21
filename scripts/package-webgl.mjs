#!/usr/bin/env node
// Packages unity/Builds/WebGL into an itch.io-ready HTML5 zip archive (WebGL.zip and unity/Builds/WebGL.zip)
// with index.html, Build/, and TemplateData/ at the archive root.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webglDir = join(rootDir, 'unity', 'Builds', 'WebGL');
const indexPath = join(webglDir, 'index.html');
const buildDir = join(webglDir, 'Build');
const templateDir = join(webglDir, 'TemplateData');
const zipPath = join(rootDir, 'WebGL.zip');
const buildsWebglZipPath = join(rootDir, 'unity', 'Builds', 'WebGL.zip');

if (!existsSync(indexPath) || !existsSync(buildDir) || !existsSync(templateDir)) {
  console.error('Missing WebGL build in unity/Builds/WebGL. Run Unity -> RISE -> Build WebGL Player first.');
  process.exit(1);
}

const SHADOW_GUARD_SCRIPT = `  <script id="rise-webgl-shadow-guard">
    // WebGL2 / ANGLE rejects draw calls when URP leaves a dummy RGBA8 texture bound to an unused sampler2DShadow uniform
    // (e.g. hlslcc_zcmp_AdditionalLightsShadowmapTexture or unshadowed cameras). Substitute a 1x1 depth shadow texture.
    (() => {
      if (typeof WebGL2RenderingContext === 'undefined') return;
      const proto = WebGL2RenderingContext.prototype;
      const depthFormats = new Set([0x1902, 0x81a5, 0x81a6, 0x81a7, 0x8cac, 0x88f0, 0x8cad]);
      const depthTex = new WeakSet();
      const shadowLocs = new WeakMap();
      const progUnits = new WeakMap();
      const origTexStorage2D = proto.texStorage2D;
      const origTexImage2D = proto.texImage2D;
      const origBindTexture = proto.bindTexture;
      const origActiveTexture = proto.activeTexture;
      const origUseProgram = proto.useProgram;
      const origGetUniformLocation = proto.getUniformLocation;
      const origUniform1i = proto.uniform1i;
      const origUniform1iv = proto.uniform1iv;
      const origDrawElements = proto.drawElements;
      const origDrawElementsInstanced = proto.drawElementsInstanced;
      const origDrawArrays = proto.drawArrays;
      const stateMap = new WeakMap();
      function getState(gl) {
        let s = stateMap.get(gl);
        if (!s) {
          s = { active: 0, bound2D: new Array(32).fill(null), prog: null, fallback: null };
          stateMap.set(gl, s);
        }
        return s;
      }
      function ensureFallback(gl, s) {
        if (s.fallback) return s.fallback;
        const fallback = gl.createTexture();
        const prevTex = s.bound2D[s.active] || null;
        origBindTexture.call(gl, 0x0de1, fallback);
        origTexImage2D.call(gl, 0x0de1, 0, gl.DEPTH_COMPONENT24 || 0x81a6, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(0x0de1, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(0x0de1, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(0x0de1, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(0x0de1, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(0x0de1, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(0x0de1, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        origBindTexture.call(gl, 0x0de1, prevTex);
        depthTex.add(fallback);
        s.fallback = fallback;
        return fallback;
      }
      proto.activeTexture = function(texture) {
        getState(this).active = texture - 0x84c0;
        return origActiveTexture.call(this, texture);
      };
      proto.bindTexture = function(target, texture) {
        const s = getState(this);
        if (target === 0x0de1) s.bound2D[s.active] = texture;
        return origBindTexture.call(this, target, texture);
      };
      proto.texStorage2D = function(target, levels, internalformat, width, height) {
        if (target === 0x0de1 && depthFormats.has(internalformat)) {
          const s = getState(this), t = s.bound2D[s.active];
          if (t) depthTex.add(t);
        }
        return origTexStorage2D.call(this, target, levels, internalformat, width, height);
      };
      proto.texImage2D = function(target, level, internalformat, ...rest) {
        if (target === 0x0de1 && depthFormats.has(internalformat)) {
          const s = getState(this), t = s.bound2D[s.active];
          if (t) depthTex.add(t);
        }
        return origTexImage2D.call(this, target, level, internalformat, ...rest);
      };
      proto.useProgram = function(program) {
        getState(this).prog = program;
        return origUseProgram.call(this, program);
      };
      proto.getUniformLocation = function(program, name) {
        const loc = origGetUniformLocation.call(this, program, name);
        if (loc && typeof name === 'string' && name.includes('ShadowmapTexture')) {
          shadowLocs.set(loc, program);
        }
        return loc;
      };
      function recordUnit(program, unit) {
        let units = progUnits.get(program);
        if (!units) { units = []; progUnits.set(program, units); }
        if (!units.includes(unit)) units.push(unit);
      }
      proto.uniform1i = function(location, x) {
        const prog = location && shadowLocs.get(location);
        if (prog) recordUnit(prog, x);
        return origUniform1i.call(this, location, x);
      };
      proto.uniform1iv = function(location, v, ...rest) {
        const prog = location && shadowLocs.get(location);
        if (prog && v && v.length) recordUnit(prog, v[0]);
        return origUniform1iv.call(this, location, v, ...rest);
      };
      function guardShadowSamplers(gl) {
        const s = stateMap.get(gl);
        if (!s || !s.prog) return;
        const units = progUnits.get(s.prog);
        if (!units) return;
        let switched = false;
        const prevActive = s.active;
        for (let i = 0; i < units.length; i++) {
          const u = units[i];
          const t = s.bound2D[u];
          if (!t || !depthTex.has(t)) {
            const fb = ensureFallback(gl, s);
            origActiveTexture.call(gl, 0x84c0 + u);
            origBindTexture.call(gl, 0x0de1, fb);
            s.bound2D[u] = fb;
            switched = true;
          }
        }
        if (switched) origActiveTexture.call(gl, 0x84c0 + prevActive);
      }
      proto.drawElements = function(mode, count, type, offset) {
        guardShadowSamplers(this);
        return origDrawElements.call(this, mode, count, type, offset);
      };
      proto.drawElementsInstanced = function(mode, count, type, offset, instanceCount) {
        guardShadowSamplers(this);
        return origDrawElementsInstanced.call(this, mode, count, type, offset, instanceCount);
      };
      proto.drawArrays = function(mode, first, count) {
        guardShadowSamplers(this);
        return origDrawArrays.call(this, mode, first, count);
      };
    })();
  </script>`;

// Ensure index.html is patched for full-viewport iframe embedding, automatic IndexedDB save syncing, no watermarks, and WebGL2 shadow-sampler safety.
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>Rise: Hustle or Die Trying</title>');
html = html.replace(/<div id="unity-build-title">.*?<\/div>/, '<div id="unity-build-title">Rise: Hustle or Die Trying</div>');
html = html.replace('productName: "RISE Lagos"', 'productName: "Rise: Hustle or Die Trying"');
html = html.replace('companyName: "DefaultCompany"', 'companyName: "Rise"');
html = html.replace('// config.autoSyncPersistentDataPath = true;', 'config.autoSyncPersistentDataPath = true;');
html = html.replace(
  'fullscreenContainer.style.width = "960px";\n        fullscreenContainer.style.height = "600px";',
  'document.querySelector("#unity-container").className = "unity-mobile";\n        canvas.className = "unity-mobile";'
);
html = html.replace(/<meta name="viewport"[^>]*>\s*/gi, '');
html = html.replace(
  '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
  '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes, viewport-fit=cover">'
);
html = html.replace(
  /if \(\/iPhone\|iPad\|iPod\|Android[^]*?\} else \{\s*\/\/ Desktop style:[^\n]*\n\s*document\.querySelector\("#unity-container"\)\.className = "unity-mobile";\s*canvas\.className = "unity-mobile";\s*\}/,
  `var isMobileDevice = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      document.querySelector("#unity-container").className = "unity-mobile";
      canvas.className = "unity-mobile";
      if (isMobileDevice) {
        config.devicePixelRatio = 1;
        config.cacheControl = function() { return "no-store"; };
        try {
          var u = new URL(window.location.href);
          var diag = u.searchParams.get("diag") || "";
          if (!diag.split(",").includes("mobile")) {
            u.searchParams.set("diag", diag ? diag + ",mobile" : "mobile");
            window.history.replaceState(null, "", u.toString());
          }
        } catch (e) {}
      }`
);
html = html.replace(/<style>html,body\{width:100%;height:100%;[^<]*<\/style>\s*/g, '');
html = html.replace('</head>', '  <style>html,body{width:100%;height:100%;height:100dvh;margin:0;overflow:hidden;background:#07100e;touch-action:none;-webkit-user-select:none;user-select:none;}#unity-container,#unity-fullscreen-container,#unity-canvas{width:100%!important;height:100%!important;}#unity-logo,#unity-footer,#unity-logo-title-footer{display:none!important;}</style>\n  </head>');
html = html.replace(/<script id="rise-webgl-shadow-guard">[\s\S]*?<\/script>\s*/g, '');
html = html.replace('</head>', `${SHADOW_GUARD_SCRIPT}\n  </head>`);
writeFileSync(indexPath, html);

// Remove stale .gz files if .unityweb files are active (or vice versa) so the zip only packs active artifacts.
const usesUnityWeb = html.includes('.unityweb');
for (const entry of readdirSync(buildDir)) {
  if (usesUnityWeb && entry.endsWith('.gz')) {
    rmSync(join(buildDir, entry), { force: true });
  } else if (!usesUnityWeb && entry.endsWith('.unityweb')) {
    rmSync(join(buildDir, entry), { force: true });
  }
}

for (const p of [zipPath, buildsWebglZipPath]) {
  if (existsSync(p)) rmSync(p, { force: true });
}

execFileSync('zip', ['-r', '-q', zipPath, 'index.html', 'Build', 'TemplateData', '-x', '*.DS_Store'], {
  cwd: webglDir,
  stdio: 'inherit',
});
copyFileSync(zipPath, buildsWebglZipPath);

const mb = bytes => (bytes / (1024 * 1024)).toFixed(1);
const zipSize = statSync(zipPath).size;
console.log(`Packaged ${zipPath} and ${buildsWebglZipPath} (${mb(zipSize)} MB)`);
for (const entry of readdirSync(buildDir)) {
  const s = statSync(join(buildDir, entry)).size;
  console.log(`  Build/${entry}: ${mb(s)} MB`);
}
