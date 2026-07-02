#!/usr/bin/env node
// CoalMine test runner — the canonical node-test gate. Enumerates EVERY node test
// file explicitly and FAILS LOUD on drift in BOTH directions:
//   listed-but-missing — `node --test` silently ignores missing file args (and on
//     Node 24 a missing arg alongside a present one is reinterpreted as a
//     zero-match name filter → the run exits 0 with the test silently dropped);
//   on-disk-but-unlisted — an orphan *.test.mjs would silently never run.
// The local pre-commit/pre-push hooks already guard with `[ -f "$t" ]`; CI passed
// the raw list unguarded, so a renamed/deleted test could green the main gate.
// This is the single guarded source both CI and the hooks can call. Fail-loud CLI
// (not a hook) — mirrors CoalTipple's scripts/test.mjs.
//
// PowerShell parity tests (scripts/lib/*.test.ps1) are run separately by the caller
// (a `pwsh` step in ci.yml / the hooks) — a cross-language runner is out of scope here.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The complete node suite — keep in sync when adding a test (the orphan check
// below fails the gate if you forget).
const TESTS = [
  'scripts/lib/render.test.mjs',
  'scripts/lib/hooks.test.mjs',
  'scripts/lib/install.test.mjs',
  'scripts/lib/configure.test.mjs',
  'scripts/lib/regions.test.mjs',
  'scripts/lib/consistency.test.mjs',
  'scripts/lib/jsonc.test.mjs',
  'scripts/lib/conductor-update.test.mjs',
];

const missing = TESTS.filter((t) => !fs.existsSync(path.join(repo, t)));
if (missing.length) {
  console.error(`test runner: ${missing.length} listed test file(s) MISSING — ${missing.join(', ')}`);
  process.exit(1);
}

const onDisk = [];
for (const dir of ['scripts', 'scripts/lib']) {
  for (const f of fs.readdirSync(path.join(repo, dir))) if (f.endsWith('.test.mjs')) onDisk.push(`${dir}/${f}`);
}
const orphans = onDisk.filter((f) => !TESTS.includes(f));
if (orphans.length) {
  console.error(`test runner: ${orphans.length} on-disk test(s) NOT in the suite — ${orphans.join(', ')}. Add to scripts/test.mjs.`);
  process.exit(1);
}

const r = spawnSync(process.execPath, ['--test', ...TESTS], { cwd: repo, stdio: 'inherit' });
process.exit(r.status ?? 1);
