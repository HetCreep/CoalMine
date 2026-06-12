// Integration tests for scripts/configure.mjs — the .coalmine.json configurator CLI.
// Zero-dep (node:test + built-ins), per scripts-quality.md section 2.
import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('configure fails loud on an invalid value and writes nothing', () => {
  const dir = freshProject();
  try {
    const r = spawnSync(process.execPath, [CONFIGURE, '--defaultTier', 'mega'], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /defaultTier/);
    assert.ok(!fs.existsSync(path.join(dir, '.coalmine.json')), 'no config may be written on failure');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
