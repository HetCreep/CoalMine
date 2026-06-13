// Unit tests for the self-consistency + manifest-integrity layers.
// Zero-dep (node:test + built-ins), per docs/scripts-quality.md section 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkCanaryCount, checkDoctrineMirrors, checkRuleStamps } from './consistency.mjs';
import { hashInstalledTree, verifyAgainstManifest, MANIFEST_NAME } from './manifest.mjs';

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-consist-'));
  fs.mkdirSync(path.join(dir, 'skills', '_shared'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  // two real skills + the _shared dir (which listSkills must exclude)
  for (const s of ['alpha-canary', 'beta-canary']) {
    fs.mkdirSync(path.join(dir, 'skills', s), { recursive: true });
    fs.writeFileSync(path.join(dir, 'skills', s, 'SKILL.md'), `---\nname: ${s}\ndescription: x\n---\nbody\n`);
  }
  return dir;
}

test('canary count: passes when plugin.json matches skills/, fails on drift', () => {
  const dir = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ description: 'CoalMine — 2 quality-canary skills for agents' }));
    assert.deepEqual(checkCanaryCount(dir), [], 'matching count is clean');

    fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ description: 'CoalMine — 5 quality-canary skills for agents' }));
    const drift = checkCanaryCount(dir);
    assert.equal(drift.length, 1);
    assert.match(drift[0].msg, /says 5 .* skills\/ has 2/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctrine mirrors: identical copies pass, a diverged copy fails', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('docs/hooks-safety.md', 'DOCTRINE\n');
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    mk('.agents/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    assert.deepEqual(checkDoctrineMirrors(dir), [], 'identical mirrors are clean');

    // tamper one mirror
    fs.writeFileSync(path.join(dir, '.agents/rules/ecc/domain/hooks-safety.md'), 'DOCTRINE\nPOISON\n');
    const f = checkDoctrineMirrors(dir);
    assert.equal(f.length, 1);
    assert.match(f[0].msg, /DIVERGED/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rule stamps: well-formed passes, malformed fails, unstamped ignored', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/good.md', '# r\n<!-- coalmine: verified 2026-06-13 · exemplar x · revalidate 90d -->\n');
    mk('.claude/rules/ecc/domain/plain.md', '# just a rule, no stamp\n');
    assert.deepEqual(checkRuleStamps(dir), [], 'well-formed + unstamped are both clean');

    mk('.claude/rules/ecc/domain/bad.md', '# r\n<!-- coalmine: verified soon, revalidate whenever -->\n');
    const f = checkRuleStamps(dir);
    assert.equal(f.length, 1);
    assert.match(f[0].msg, /malformed coalmine stamp/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('manifest integrity: clean install verifies, post-install tamper is caught', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-sfc-'));
  try {
    fs.mkdirSync(path.join(dest, 'alpha-canary'));
    const f = path.join(dest, 'alpha-canary', 'SKILL.md');
    fs.writeFileSync(f, 'original\n');
    const hashes = hashInstalledTree(dest, ['alpha-canary']);
    fs.writeFileSync(path.join(dest, MANIFEST_NAME), JSON.stringify({ version: '9.9.9', skills: ['alpha-canary'], hashes }));

    const clean = verifyAgainstManifest(dest);
    assert.equal(clean.ok, true);
    assert.equal(clean.checked, 1);

    fs.writeFileSync(f, 'TAMPERED\n');
    const dirty = verifyAgainstManifest(dest);
    assert.equal(dirty.ok, false);
    assert.ok(dirty.findings.some((x) => /TAMPERED/.test(x.msg)));

    fs.rmSync(f);
    const missing = verifyAgainstManifest(dest);
    assert.ok(missing.findings.some((x) => /MISSING/.test(x.msg)));
  } finally { fs.rmSync(dest, { recursive: true, force: true }); }
});

test('manifest integrity: a manifest hash entry cannot escape the target dir', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-sfc-esc-'));
  try {
    fs.writeFileSync(path.join(dest, MANIFEST_NAME), JSON.stringify({
      version: '9.9.9', skills: ['x'], hashes: { '../../etc/passwd': 'deadbeef' },
    }));
    const r = verifyAgainstManifest(dest);
    assert.ok(r.findings.some((x) => /path-traversal/.test(x.msg)), 'traversal entry is rejected, not hashed');
  } finally { fs.rmSync(dest, { recursive: true, force: true }); }
});
