import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repo,
  // The game engine lives one level up in ../src and is shared with the static build (../index.html).
  experimental: { externalDir: true },
  // Turbopack (Next 16 dev + build): root at the repo so ../src is inside the project; the engine's 'three' comes from the root package.json.
  turbopack: {
    root: repo,
    resolveAlias: { '@engine': './src' },   // 'three' resolves from the repo-root node_modules (root package.json)
  },
  // Webpack (next build): same aliases.
  webpack: config => {
    config.resolve.alias['@engine'] = path.resolve(repo, 'src');
    config.resolve.alias['three'] = path.resolve(root, 'node_modules/three');
    config.resolve.modules = [path.resolve(root, 'node_modules'), 'node_modules'];
    return config;
  },
};
export default nextConfig;
