import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(root, '..'),
  // The game engine lives one level up in ../src and is shared with the static build (../index.html).
  experimental: { externalDir: true },
  webpack: config => {
    config.resolve.alias['@engine'] = path.resolve(root, '../src');
    // ../src sits outside this package, so point its bare 'three' imports at our copy.
    config.resolve.alias['three'] = path.resolve(root, 'node_modules/three');
    config.resolve.modules = [path.resolve(root, 'node_modules'), 'node_modules'];
    return config;
  },
};
export default nextConfig;
