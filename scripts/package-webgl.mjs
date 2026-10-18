#!/usr/bin/env node
// Packages unity/Builds/WebGL into an itch.io-ready HTML5 zip archive (unity/Builds/Rise-Lagos-WebGL.zip)
// with index.html, Build/, and TemplateData/ at the archive root.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webglDir = join(rootDir, 'unity', 'Builds', 'WebGL');
const indexPath = join(webglDir, 'index.html');
const buildDir = join(webglDir, 'Build');
const templateDir = join(webglDir, 'TemplateData');
const zipPath = join(rootDir, 'unity', 'Builds', 'Rise-Lagos-WebGL.zip');

if (!existsSync(indexPath) || !existsSync(buildDir) || !existsSync(templateDir)) {
  console.error('Missing WebGL build in unity/Builds/WebGL. Run Unity -> RISE -> Build WebGL Player first.');
  process.exit(1);
}

// Ensure index.html is patched for full-viewport iframe embedding and automatic IndexedDB save syncing.
let html = readFileSync(indexPath, 'utf8');
html = html.replace('// config.autoSyncPersistentDataPath = true;', 'config.autoSyncPersistentDataPath = true;');
html = html.replace(
  'fullscreenContainer.style.width = "960px";\n        fullscreenContainer.style.height = "600px";',
  'document.querySelector("#unity-container").className = "unity-mobile";\n        canvas.className = "unity-mobile";'
);
if (!html.includes('overflow:hidden;background:#07100e')) {
  html = html.replace('</head>', '  <style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#07100e;}</style>\n  </head>');
}
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

if (existsSync(zipPath)) rmSync(zipPath, { force: true });

execFileSync('zip', ['-r', '-q', zipPath, 'index.html', 'Build', 'TemplateData', '-x', '*.DS_Store'], {
  cwd: webglDir,
  stdio: 'inherit',
});

const mb = bytes => (bytes / (1024 * 1024)).toFixed(1);
const zipSize = statSync(zipPath).size;
console.log(`Packaged ${zipPath} (${mb(zipSize)} MB)`);
for (const entry of readdirSync(buildDir)) {
  const s = statSync(join(buildDir, entry)).size;
  console.log(`  Build/${entry}: ${mb(s)} MB`);
}
