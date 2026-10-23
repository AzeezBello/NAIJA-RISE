#!/usr/bin/env node
// Unified deployment & release automation runner for Rise: Hustle or Die Trying.
// Usage:
//   node scripts/deploy.mjs <target> [--dry-run] [--full] [--tag <vX.Y.Z>]
//
// Targets:
//   manifest            Generate unity/Builds/build-manifest.json with SHA-256 checksums & sizes of built artifacts
//   itch                Push built WebGL, macOS, Windows, and Android artifacts to itch.io via butler
//   render              Trigger a production Render deployment for the Next.js companion/admin site
//   supabase            Verify & sync live Supabase schema, RLS tables, and game-config/economy.json
//   release             End-to-end verification, Web + Unity build/package, manifest generation, and optional deploy
//   all                 Run manifest -> supabase -> itch -> render

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildsDir = join(rootDir, 'unity', 'Builds');

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const dryRun = flags.has('--dry-run');
const fullBuild = flags.has('--full');
const tagIdx = args.indexOf('--tag');
const releaseTag = tagIdx !== -1 && args[tagIdx + 1] ? args[tagIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && (tagIdx === -1 || i !== tagIdx + 1));
const target = (positional[0] || 'release').toLowerCase();

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = {
  ...parseEnvFile(join(rootDir, '.env')),
  ...parseEnvFile(join(rootDir, 'web', '.env')),
  ...parseEnvFile(join(rootDir, 'web', '.env.local')),
  ...process.env,
};

function getGitInfo() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
    return { sha, branch };
  } catch {
    return { sha: 'unknown', branch: 'unknown' };
  }
}

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    return releaseTag || env.RELEASE_VERSION || pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function directorySize(dirPath) {
  let total = 0;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) total += directorySize(full);
    else if (entry.isFile()) total += statSync(full).size;
  }
  return total;
}

function generateManifest() {
  mkdirSync(buildsDir, { recursive: true });
  const git = getGitInfo();
  const version = getVersion();

  // IfBuilds/WebGL exists and WebGL.zip is missing or older, package it first
  const webglIndex = join(buildsDir, 'WebGL', 'index.html');
  const rootWebglZip = join(rootDir, 'WebGL.zip');
  if (existsSync(webglIndex) && !existsSync(rootWebglZip) && !dryRun) {
    execFileSync(process.execPath, [join(rootDir, 'scripts', 'package-webgl.mjs')], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  }

  // If Rise.app exists and Rise-macOS.zip is missing, package it
  const macApp = join(buildsDir, 'Rise.app');
  const macZip = join(buildsDir, 'Rise-macOS.zip');
  if (existsSync(macApp) && !existsSync(macZip) && !dryRun) {
    console.log('[deploy] Packaging Rise-macOS.zip from Rise.app...');
    execFileSync('zip', ['-r', '-q', '-y', macZip, 'Rise.app', '-x', '*.DS_Store'], {
      cwd: buildsDir,
      stdio: 'inherit',
    });
  }

  const candidateArtifacts = [
    { id: 'webgl-zip', platform: 'WebGL', channel: 'html5', path: join(rootDir, 'WebGL.zip'), type: 'file' },
    { id: 'webgl-dir', platform: 'WebGL', channel: 'html5', path: join(buildsDir, 'WebGL'), type: 'dir' },
    { id: 'macos-zip', platform: 'macOS', channel: 'osx', path: join(buildsDir, 'Rise-macOS.zip'), type: 'file' },
    { id: 'macos-app', platform: 'macOS', channel: 'osx', path: join(buildsDir, 'Rise.app'), type: 'dir' },
    { id: 'windows-zip', platform: 'Windows', channel: 'win64', path: join(buildsDir, 'Rise-Windows.zip'), type: 'file' },
    { id: 'windows-exe', platform: 'Windows', channel: 'win64', path: join(buildsDir, 'Windows', 'Rise.exe'), type: 'file' },
    { id: 'android-apk', platform: 'Android', channel: 'android', path: join(buildsDir, 'Android', 'Rise.apk'), type: 'file' },
    { id: 'ios-xcode', platform: 'iOS', channel: 'ios', path: join(buildsDir, 'iOS'), type: 'dir' },
    { id: 'world-lagos-json', platform: 'Data', channel: 'data', path: join(rootDir, 'unity', 'Assets', 'Rise', 'Resources', 'world', 'lagos.json'), type: 'file' },
    { id: 'world-manifest-json', platform: 'Data', channel: 'data', path: join(rootDir, 'unity', 'Assets', 'Rise', 'Resources', 'world', 'manifest.json'), type: 'file' },
  ];

  const artifacts = [];
  for (const item of candidateArtifacts) {
    if (!existsSync(item.path)) continue;
    const st = statSync(item.path);
    const bytes = item.type === 'dir' ? directorySize(item.path) : st.size;
    const sha256 = item.type === 'file' ? sha256File(item.path) : null;
    artifacts.push({
      id: item.id,
      platform: item.platform,
      channel: item.channel,
      path: relative(rootDir, item.path),
      sizeBytes: bytes,
      sizeMB: Number((bytes / (1024 * 1024)).toFixed(2)),
      sha256,
      modifiedAt: st.mtime.toISOString(),
    });
  }

  const manifest = {
    productName: 'Rise: Hustle or Die Trying',
    version,
    gitCommit: git.sha,
    gitBranch: git.branch,
    generatedAt: new Date().toISOString(),
    artifacts,
  };

  const manifestPath = join(buildsDir, 'build-manifest.json');
  if (!dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`[deploy] Build manifest (${artifacts.length} artifacts, v${version} @ ${git.sha}) -> ${relative(rootDir, manifestPath)}`);
  for (const a of artifacts) {
    console.log(`  - [${a.platform}] ${a.path} (${a.sizeMB} MB)${a.sha256 ? ` sha256:${a.sha256.slice(0, 12)}...` : ''}`);
  }
  return manifest;
}

function findButlerBinary() {
  if (env.BUTLER_PATH && existsSync(env.BUTLER_PATH)) return env.BUTLER_PATH;
  const home = process.env.HOME || '';
  const candidates = [
    '/usr/local/bin/butler',
    '/opt/homebrew/bin/butler',
    join(home, 'Library', 'Application Support', 'itch', 'broth', 'butler', 'bin', 'butler'),
    join(home, '.config', 'itch', 'broth', 'butler', 'bin', 'butler'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  try {
    return execFileSync('which', ['butler'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function deployItch() {
  const itchTarget = env.ITCH_TARGET || 'risestudios/rise';
  const version = getVersion();
  const butlerBin = findButlerBinary();

  const pushes = [
    { channel: 'html5', path: join(rootDir, 'WebGL.zip') },
    { channel: 'osx', path: existsSync(join(buildsDir, 'Rise-macOS.zip')) ? join(buildsDir, 'Rise-macOS.zip') : join(buildsDir, 'Rise.app') },
    { channel: 'win64', path: existsSync(join(buildsDir, 'Rise-Windows.zip')) ? join(buildsDir, 'Rise-Windows.zip') : join(buildsDir, 'Windows') },
    { channel: 'android', path: join(buildsDir, 'Android', 'Rise.apk') },
  ].filter(p => existsSync(p.path));

  if (pushes.length === 0) {
    console.warn('[deploy:itch] No built artifacts found to push. Run `npm run build:webgl` or `npm run build:mac` first.');
    return;
  }

  if (!butlerBin || dryRun || !env.BUTLER_API_KEY) {
    const reason = dryRun
      ? 'dry-run mode'
      : !butlerBin
      ? 'butler CLI not installed'
      : 'BUTLER_API_KEY not set in environment';
    console.log(`[deploy:itch] Skipping live push (${reason}). Planned butler commands for ${itchTarget} (v${version}):`);
    for (const p of pushes) {
      console.log(`  butler push "${relative(rootDir, p.path)}" ${itchTarget}:${p.channel} --userversion ${version}`);
    }
    return;
  }

  for (const p of pushes) {
    console.log(`[deploy:itch] Pushing ${relative(rootDir, p.path)} -> ${itchTarget}:${p.channel} (v${version})...`);
    execFileSync(butlerBin, ['push', p.path, `${itchTarget}:${p.channel}`, '--userversion', version], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, BUTLER_API_KEY: env.BUTLER_API_KEY },
    });
  }
}

async function deployRender() {
  const hookUrl = env.RENDER_DEPLOY_HOOK_URL;
  if (!hookUrl || dryRun) {
    const reason = dryRun ? 'dry-run mode' : 'RENDER_DEPLOY_HOOK_URL not set';
    console.log(`[deploy:render] Skipping live webhook trigger (${reason}).`);
    console.log('  Set RENDER_DEPLOY_HOOK_URL in .env or GitHub Actions secrets to trigger Render builds automatically.');
    return;
  }

  console.log('[deploy:render] Triggering Render production deployment via deploy hook...');
  const res = await fetch(hookUrl, { method: 'POST' });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`[deploy:render] Render deploy hook failed with HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  console.log(`[deploy:render] Render deploy triggered (HTTP ${res.status}): ${body.slice(0, 120)}`);
}

function deploySupabase() {
  console.log('[deploy:supabase] Verifying & syncing live Supabase deployment...');
  if (dryRun) {
    console.log('[deploy:supabase] [dry-run] Would execute: node scripts/verify-supabase.mjs');
    return;
  }
  execFileSync(process.execPath, [join(rootDir, 'scripts', 'verify-supabase.mjs')], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

async function runRelease() {
  console.log('[release] Step 1/5: Checking shared world & state data (npm run check)...');
  if (!dryRun) {
    execFileSync('npm', ['run', 'check'], { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('[release] Step 2/5: Exporting world JSON & manifest (npm run export:unity)...');
  if (!dryRun) {
    execFileSync(process.execPath, [join(rootDir, 'scripts', 'export-world.mjs')], { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('[release] Step 3/5: Running Unity C# compilation check...');
  execFileSync(
    process.execPath,
    [join(rootDir, 'scripts', 'build-unity.mjs'), 'compile', ...(dryRun ? ['--dry-run'] : [])],
    { cwd: rootDir, stdio: 'inherit' }
  );

  if (fullBuild) {
    console.log('[release] Running full Unity headless SmokeTest, PlayTest, WebGL & macOS builds (--full)...');
    for (const step of ['smoke', 'playtest', 'webgl', 'mac']) {
      execFileSync(
        process.execPath,
        [join(rootDir, 'scripts', 'build-unity.mjs'), step, '--skip-export', ...(dryRun ? ['--dry-run'] : [])],
        { cwd: rootDir, stdio: 'inherit' }
      );
    }
  }

  console.log('[release] Step 4/5: Building Next.js companion & admin site (npm run web:build)...');
  if (!dryRun) {
    execFileSync('npm', ['run', 'web:build'], { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('[release] Step 5/5: Generating build artifact manifest...');
  generateManifest();

  if (releaseTag) {
    const uploadFiles = [
      join(rootDir, 'WebGL.zip'),
      join(buildsDir, 'Rise-macOS.zip'),
      join(buildsDir, 'Rise-Windows.zip'),
      join(buildsDir, 'Android', 'Rise.apk'),
      join(buildsDir, 'build-manifest.json'),
    ].filter(f => existsSync(f));

    if (dryRun) {
      console.log(`[release] [dry-run] Would upload ${uploadFiles.length} artifacts to GitHub Release ${releaseTag}`);
    } else if (uploadFiles.length > 0) {
      console.log(`[release] Uploading ${uploadFiles.length} artifacts to GitHub Release ${releaseTag}...`);
      execFileSync('gh', ['release', 'upload', releaseTag, '--clobber', ...uploadFiles], {
        cwd: rootDir,
        stdio: 'inherit',
      });
    }
  }

  console.log('[release] Release pipeline complete.');
}

try {
  switch (target) {
    case 'manifest':
      generateManifest();
      break;
    case 'itch':
      generateManifest();
      deployItch();
      break;
    case 'render':
      await deployRender();
      break;
    case 'supabase':
      deploySupabase();
      break;
    case 'release':
      await runRelease();
      break;
    case 'all':
      await runRelease();
      deploySupabase();
      deployItch();
      await deployRender();
      break;
    default:
      throw new Error(`Unknown deploy target "${target}". Expected one of: manifest, itch, render, supabase, release, all`);
  }
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
