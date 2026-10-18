// Render runs `yarn` (install) as its build command and `yarn start` to serve, from the repo root.
// What the root serves is the Next.js site in web/ (landing page, /account, /admin, /play).
// Yarn runs this as the root `postinstall`; it only builds when Render is the one installing (Render sets RENDER=true),
// so a local `npm install` or CI's own install is not slowed down by a second site build.
import { execSync } from 'node:child_process';

if (!process.env.RENDER) {
  console.log('[render-build] not on Render: skipping the web/ build (run `npm run web:build` to build it here)');
  process.exit(0);
}
const run = cmd => { console.log(`[render-build] ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
run('npm --prefix web install --include=dev');
run('npm --prefix web run build');
