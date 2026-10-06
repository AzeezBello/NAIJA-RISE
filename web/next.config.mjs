import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: root,
  // The game engine is copied from ../src into ./engine (and ../styles into ./styles) by scripts/sync-engine.mjs
  // before every dev and build, so everything the bundler needs lives inside this project.
  turbopack: { resolveAlias: { '@engine': './engine' } },
  webpack: config => { config.resolve.alias['@engine'] = path.resolve(root, 'engine'); return config; },
};
export default nextConfig;
