// CoalMine installer integration tests — node:test built-in, zero dependencies.
// Run: node --test scripts/lib/install.test.mjs
// Covers the manifest-driven clean version transition: renamed/removed skills
// from a previous install never linger, foreign skills are never touched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INSTALL = path.join(repo, 'scripts', 'install.mjs');
const MANIFEST = '.coalmine-manifest.json';

function runInstall(target, cwd, extra = []) {
  return spawnSync(process.execPath, [INSTALL, ...extra, target], { cwd, encoding: 'utf8', timeout: 60_000 });
}

test('manifest-driven reinstall removes renamed leftovers, spares foreign skills', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-install-'));
  const target = path.join(tmp, 'skills');
  try {
    // 1. Fresh install → 9 skills + manifest listing them.
    const first = runInstall(target, tmp);
    assert.equal(first.status, 0, `first install must pass:\n${first.stdout}${first.stderr}`);
    const manifest1 = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(manifest1.skills.length, 9, 'manifest records all 9 skills');
    assert.ok(manifest1.version, 'manifest records the version');

    // 2. Simulate a pre-rename install: plant a legacy skill dir and list it
    //    in the manifest, plus a foreign skill CoalMine never installed.
    fs.mkdirSync(path.join(target, 'old-renamed-skill'));
    fs.writeFileSync(path.join(target, 'old-renamed-skill', 'SKILL.md'), 'legacy', 'utf8');
    fs.mkdirSync(path.join(target, 'foreign-skill'));
    fs.writeFileSync(path.join(target, 'foreign-skill', 'SKILL.md'), 'not ours', 'utf8');
    manifest1.skills.push('old-renamed-skill');
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(manifest1), 'utf8');

    // 3. Reinstall → legacy dir cleaned via manifest, foreign dir untouched.
    const second = runInstall(target, tmp);
    assert.equal(second.status, 0, `reinstall must pass:\n${second.stdout}${second.stderr}`);
    assert.ok(!fs.existsSync(path.join(target, 'old-renamed-skill')), 'manifest-listed legacy skill removed');
    assert.ok(fs.existsSync(path.join(target, 'foreign-skill', 'SKILL.md')), 'foreign skill must never be touched');
    const manifest2 = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(manifest2.skills.length, 9, 'new manifest lists only the current set');
    assert.ok(!manifest2.skills.includes('old-renamed-skill'), 'legacy name gone from manifest');

    // 4. Uninstall → manifest-listed skills + manifest gone, foreign survives.
    const un = runInstall(target, tmp, ['--uninstall']);
    assert.equal(un.status, 0, `uninstall must pass:\n${un.stdout}${un.stderr}`);
    assert.ok(!fs.existsSync(path.join(target, 'rotcanary')), 'installed skill removed on uninstall');
    assert.ok(!fs.existsSync(path.join(target, MANIFEST)), 'manifest removed on uninstall');
    assert.ok(fs.existsSync(path.join(target, 'foreign-skill', 'SKILL.md')), 'foreign skill survives uninstall');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('corrupt manifest entries can never escape the target directory', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-escape-'));
  const target = path.join(tmp, 'skills');
  const sentinel = path.join(tmp, 'sentinel-dir');
  try {
    const first = runInstall(target, tmp);
    assert.equal(first.status, 0);

    // Sibling dir OUTSIDE the target — a '..' entry would wipe it (and the target).
    fs.mkdirSync(sentinel);
    fs.writeFileSync(path.join(sentinel, 'keep.txt'), 'must survive', 'utf8');

    const manifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    manifest.skills = ['..', '.', '../sentinel-dir', tmp, '.coalmine-manifest.json', 'rotcanary'];
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(manifest), 'utf8');

    const second = runInstall(target, tmp);
    assert.equal(second.status, 0, `reinstall with corrupt manifest must still pass:\n${second.stdout}${second.stderr}`);
    assert.ok(fs.existsSync(path.join(sentinel, 'keep.txt')), 'escape via .. must be impossible');
    assert.ok(fs.existsSync(path.join(target, 'rotcanary', 'SKILL.md')), 'valid entries still install');
    const after = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(after.skills.length, 9, 'manifest rebuilt with the clean current set');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
