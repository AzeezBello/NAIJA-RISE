#!/usr/bin/env node
// Configures Git to use the version-controlled hooks in .githooks/ (pre-commit & pre-push).
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gitDir = join(rootDir, '.git');
const hooksDir = join(rootDir, '.githooks');

if (!existsSync(gitDir) || !existsSync(hooksDir)) {
  process.exit(0);
}

for (const hook of ['pre-commit', 'pre-push']) {
  const p = join(hooksDir, hook);
  if (existsSync(p)) {
    try {
      chmodSync(p, 0o755);
    } catch {}
  }
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: rootDir, stdio: 'ignore' });
  console.log('[hooks] Configured git core.hooksPath -> .githooks (pre-commit, pre-push)');
} catch {
  console.log('[hooks] Verified .githooks/pre-commit & .githooks/pre-push (run `git config core.hooksPath .githooks` if not yet set)');
}
