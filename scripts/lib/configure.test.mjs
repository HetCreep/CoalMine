// Integration tests for scripts/configure.mjs — the .coalmine.json configurator CLI.
// Zero-dep (node:test + built-ins), per scripts-quality.md section 2.
import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_SCHEMA } from './config-schema.mjs';

const CONFIGURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'configure.mjs');

function freshProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-cfg-'));
  fs.mkdirSync(path.join(dir, '.git')); // findGitRoot anchor
  return dir;
}

test('configure writes values and migrates legacy/retired keys away', () => {
  const dir = freshProject();
  try {
    fs.writeFileSync(path.join(dir, '.coalmine.json'),
      JSON.stringify({ disable: ['rot-canary'], conductor: false, tempSweepProbability: 0.5 }), 'utf8');
    const r = spawnSync(process.execPath, [CONFIGURE, '--language', 'th'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(r.status, 0, r.stderr);
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.coalmine.json'), 'utf8'));
    assert.strictEqual(cfg.language, 'th');
    assert.deepStrictEqual(cfg.disabledCanaries, ['rot-canary']); // legacy disable → disabledCanaries
    assert.strictEqual(cfg.enableConductor, false);               // legacy conductor → enableConductor
    assert.ok(!('disable' in cfg) && !('conductor' in cfg) && !('tempSweepProbability' in cfg),
      'legacy and retired keys must be removed');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('help documents every schema key — drift between table and help is impossible to ship', () => {
  const r = spawnSync(process.execPath, [CONFIGURE, '--help'], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0);
  for (const spec of CONFIG_SCHEMA) {
    assert.ok(r.stdout.includes(`--${spec.key}`), `help is missing --${spec.key}`);
  }
});

test('configure writes a valid updateMode and rejects an out-of-enum value', () => {
  const dir = freshProject();
  try {
    const ok = spawnSync(process.execPath, [CONFIGURE, '--updateMode', 'auto'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(ok.status, 0, ok.stderr);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.coalmine.json'), 'utf8')).updateMode, 'auto');

    const bad = spawnSync(process.execPath, [CONFIGURE, '--updateMode', 'sometimes'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(bad.status, 0, 'an out-of-enum updateMode must fail loud');
    assert.match(bad.stderr, /updateMode/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('configure enforces the updateCheckDays minimum (≥ 1)', () => {
  const dir = freshProject();
  try {
    const bad = spawnSync(process.execPath, [CONFIGURE, '--updateCheckDays', '0'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(bad.status, 0, 'updateCheckDays below the minimum must fail loud');
    assert.match(bad.stderr, /updateCheckDays/);
    assert.ok(!fs.existsSync(path.join(dir, '.coalmine.json')), 'no config may be written on a min violation');

    const ok = spawnSync(process.execPath, [CONFIGURE, '--updateCheckDays', '7'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(ok.status, 0, ok.stderr);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.coalmine.json'), 'utf8')).updateCheckDays, 7);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('configure fails loud on an invalid value and writes nothing', () => {
  const dir = freshProject();
  try {
    const r = spawnSync(process.execPath, [CONFIGURE, '--defaultTier', 'mega'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /defaultTier/);
    assert.ok(!fs.existsSync(path.join(dir, '.coalmine.json')), 'no config may be written on failure');

    // A trailing list flag with no value must error, not silently clear the list.
    const r2 = spawnSync(process.execPath, [CONFIGURE, '--disable'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(r2.status, 0);
    assert.match(r2.stderr, /disabledCanaries/);
    assert.ok(!fs.existsSync(path.join(dir, '.coalmine.json')), 'no config may be written on failure');

    // A bool flag with no value (or a non-boolean word) must error, not silently write false.
    const r3 = spawnSync(process.execPath, [CONFIGURE, '--skipOnboarding'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(r3.status, 0);
    assert.match(r3.stderr, /skipOnboarding/);
    assert.ok(!fs.existsSync(path.join(dir, '.coalmine.json')), 'no config may be written on failure');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
