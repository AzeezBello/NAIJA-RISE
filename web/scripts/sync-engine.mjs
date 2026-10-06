// Copies the shared game engine (../src) and styles (../styles) into this Next project before dev/build,
// so the bundler resolves `three` and friends from web/node_modules and nothing outside the project root is needed.
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [['../src', 'engine'], ['../styles', 'styles']];
for (const [from, to] of pairs) {
  const src = resolve(web, from), dst = resolve(web, to);
  if (!existsSync(src)) { console.error(`[sync-engine] missing ${src} — the Next app must sit inside the NAIJA RISE repo`); process.exit(1); }
  rmSync(dst, { recursive: true, force: true }); mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`[sync-engine] ${from} → web/${to}`);
}
