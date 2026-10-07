# Deploying NAIJA RISE — Lagos to Vercel

The deployable app is the Next.js shell in `web/`. It bundles the game engine from `../src` and the shared styles from `../styles`.

## One-time project setup (Vercel dashboard)
1. Import the Git repository.
2. **Root Directory:** `web`. Leave "Include source files outside of the Root Directory in the Build Step" **enabled** (default) — the sync script reads `../src` and `../styles` from the cloned repo.
3. Framework preset: Next.js (auto-detected). Build command **`npm run build`** (not `next build`: the `prebuild` hook runs the engine sync), install command `npm install` (both in `web/vercel.json`). If the dashboard overrides the build command, set it to `npm run build` there too.
4. Node 20 or newer (set in `web/package.json` → `engines`).

`npm run build` (and `npm run dev`) first runs `scripts/sync-engine.mjs`, which copies `../src` to `web/engine` and `../styles` to `web/styles`. The bundler then resolves `three` and `three/addons` from `web/node_modules`; nothing outside the project root is bundled. The copies are git-ignored.

## CLI
```bash
npm i -g vercel
cd web
vercel            # preview deployment
vercel --prod     # production
```

## Routes
- `/` landing page with the React Three Fiber hero
- `/play` the game (client-only; progress saves in the browser's localStorage)
- `/manifest.webmanifest`, `/icon.svg` — installable PWA

## Checks before deploying
```bash
npm run check                 # repo root: every engine module parses
cd web && npm run build       # Next 16 production build (Turbopack)
```

## Not deployed
- `index.html` + `sw.js` at the repo root are the static build for local play and GitHub Pages; Vercel serves the Next shell instead.
- No server-side state yet: accounts and server saves are Alpha 1.0+ (see PLAN.md).
