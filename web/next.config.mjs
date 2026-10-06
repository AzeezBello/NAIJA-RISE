import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The game engine lives one level up in ../src and is shared with the static build (../index.html).
  experimental: { externalDir: true },
  webpack: config => {
    config.resolve.alias['@engine'] = path.resolve(root, '../src');
    return config;
  },
};
export default nextConfig;
