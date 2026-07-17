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
import { detectPresentAgents } from './targets.mjs';

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
    assert.ok(!fs.existsSync(path.join(target, 'rot-canary')), 'installed skill removed on uninstall');
    assert.ok(!fs.existsSync(path.join(target, MANIFEST)), 'manifest removed on uninstall');
    assert.ok(fs.existsSync(path.join(target, 'foreign-skill', 'SKILL.md')), 'foreign skill survives uninstall');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('retired skill names are swept even without a manifest (rotcanary -> rot-canary)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-retired-'));
  const target = path.join(tmp, 'skills');
  try {
    // A very old install: the pre-rename `rotcanary` dir is present but is in
    // NEITHER a manifest (none here) NOR the current skill set, plus a foreign skill.
    fs.mkdirSync(path.join(target, 'rotcanary'), { recursive: true });
    fs.writeFileSync(path.join(target, 'rotcanary', 'SKILL.md'), 'name: rotcanary', 'utf8');
    fs.mkdirSync(path.join(target, 'foreign-skill'));
    fs.writeFileSync(path.join(target, 'foreign-skill', 'SKILL.md'), 'not ours', 'utf8');

    const res = runInstall(target, tmp);
    assert.equal(res.status, 0, `install must pass:\n${res.stdout}${res.stderr}`);
    assert.ok(!fs.existsSync(path.join(target, 'rotcanary')), 'retired rotcanary removed without a manifest');
    assert.ok(fs.existsSync(path.join(target, 'rot-canary', 'SKILL.md')), 'current rot-canary installed');
    assert.ok(fs.existsSync(path.join(target, 'foreign-skill', 'SKILL.md')), 'foreign skill never touched');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('H12: install into a dir with a FOREIGN colliding skill dir preserves the user data (never delete-then-write what we do not own)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-h12-'));
  const target = path.join(tmp, 'skills');
  const precious = path.join(target, 'gold-standard', 'precious.txt');
  try {
    // No manifest. A foreign dir shares a CoalMine skill's NAME but holds the user's
    // own file — a blind delete-then-write would destroy it (the H12 root cause).
    fs.mkdirSync(path.join(target, 'gold-standard'), { recursive: true });
    fs.writeFileSync(precious, 'IRREPLACEABLE', 'utf8');

    const res = runInstall(target, tmp);
    assert.notEqual(res.status, 0, 'must fail loud (non-zero) when it refuses a foreign collision');
    assert.match(res.stdout + res.stderr, /refused/i, 'the refusal is reported');
    assert.ok(fs.existsSync(precious), 'foreign user data must survive');
    assert.equal(fs.readFileSync(precious, 'utf8'), 'IRREPLACEABLE', 'foreign data is left byte-untouched');
    assert.ok(!fs.existsSync(path.join(target, 'gold-standard', 'SKILL.md')), 'the refused skill is NOT written over the foreign dir');
    // Only the collision is skipped — the non-colliding skills still install.
    assert.ok(fs.existsSync(path.join(target, 'rot-canary', 'SKILL.md')), 'other skills still install');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('H12: uninstall (no manifest) leaves a FOREIGN colliding dir in place', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-h12un-'));
  const target = path.join(tmp, 'skills');
  const precious = path.join(target, 'gold-standard', 'precious.txt');
  try {
    fs.mkdirSync(path.join(target, 'gold-standard'), { recursive: true });
    fs.writeFileSync(precious, 'IRREPLACEABLE', 'utf8');

    const res = runInstall(target, tmp, ['--uninstall']);
    assert.equal(res.status, 0, `uninstall must pass:\n${res.stdout}${res.stderr}`);
    assert.ok(fs.existsSync(precious), 'foreign user data must survive an uninstall too');
    assert.equal(fs.readFileSync(precious, 'utf8'), 'IRREPLACEABLE');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('a colliding dir carrying our own skill-meta.json marker IS replaced (pre-manifest upgrade — the guard is not locked tight)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-premanifest-'));
  const target = path.join(tmp, 'skills');
  try {
    // A pre-manifest CoalMine install: no manifest, but the dir carries OUR marker
    // (skill-meta.json) — so it is owned and must upgrade cleanly, not be refused.
    fs.mkdirSync(path.join(target, 'gold-standard'), { recursive: true });
    fs.writeFileSync(path.join(target, 'gold-standard', 'skill-meta.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(target, 'gold-standard', 'stale.txt'), 'old', 'utf8');

    const res = runInstall(target, tmp);
    assert.equal(res.status, 0, `owned dir must upgrade cleanly:\n${res.stdout}${res.stderr}`);
    assert.ok(fs.existsSync(path.join(target, 'gold-standard', 'SKILL.md')), 'the owned skill is (re)installed');
    assert.ok(!fs.existsSync(path.join(target, 'gold-standard', 'stale.txt')), 'a stale file from the old owned install is cleared');
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
    manifest.skills = ['..', '.', '../sentinel-dir', tmp, '.coalmine-manifest.json', 'rot-canary'];
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(manifest), 'utf8');

    const second = runInstall(target, tmp);
    assert.equal(second.status, 0, `reinstall with corrupt manifest must still pass:\n${second.stdout}${second.stderr}`);
    assert.ok(fs.existsSync(path.join(sentinel, 'keep.txt')), 'escape via .. must be impossible');
    assert.ok(fs.existsSync(path.join(target, 'rot-canary', 'SKILL.md')), 'valid entries still install');
    const after = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(after.skills.length, 9, 'manifest rebuilt with the clean current set');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('installer run from the CoalMine source repo does NOT drop a root .coalmine.json (self-pollution guard)', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-selfpol-'));
  const rootCfg = path.join(repo, '.coalmine.json');
  // The full installer also rewrites .git/hooks/{pre-commit,pre-push} from the source
  // copies; snapshot those (and the root config) so the test leaves the real repo byte-
  // identical no matter what the guard does.
  const snap = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);
  const restore = (p, buf) => { if (buf === null) { try { fs.rmSync(p, { force: true }); } catch {} } else fs.writeFileSync(p, buf); };
  const cfgBefore = snap(rootCfg);
  const pc = path.join(repo, '.git', 'hooks', 'pre-commit');
  const pp = path.join(repo, '.git', 'hooks', 'pre-push');
  const pcBefore = snap(pc);
  const ppBefore = snap(pp);
  try {
    // cwd === repo → copyDefaultConfig must skip the write entirely.
    const r = runInstall(target, repo);
    assert.equal(r.status, 0, `install from source repo must pass:\n${r.stdout}${r.stderr}`);
    if (cfgBefore === null) {
      assert.ok(!fs.existsSync(rootCfg), 'no .coalmine.json may be created at the source repo root');
    }
    assert.match(r.stdout, /self-pollution|source repo/i, 'the skip is reported');
  } finally {
    // Leave the real repo exactly as found (config + git hooks).
    restore(rootCfg, cfgBefore);
    restore(pc, pcBefore);
    restore(pp, ppBefore);
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('installer run from a real project (cwd ≠ source repo) DOES create the root .coalmine.json', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-realproj-'));
  fs.mkdirSync(path.join(proj, '.git')); // a real project repo
  const target = path.join(proj, 'skills');
  try {
    const r = runInstall(target, proj);
    assert.equal(r.status, 0, `install into a real project must pass:\n${r.stdout}${r.stderr}`);
    assert.ok(fs.existsSync(path.join(proj, '.coalmine.json')), 'a real project still gets its default config (guard must not over-trigger)');
  } finally {
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('detectPresentAgents: only agents whose marker dir exists; claude/cline never auto-detected', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-detect-'));
  try {
    fs.mkdirSync(path.join(tmp, '.cursor'));
    fs.mkdirSync(path.join(tmp, '.github'));
    fs.mkdirSync(path.join(tmp, '.claude')); // present, but excluded from `all`
    const { present, absent } = detectPresentAgents(tmp);

    assert.ok(present.includes('cursor'), 'cursor present (.cursor exists)');
    assert.ok(present.includes('copilot'), 'copilot present (.github exists)');
    assert.ok(absent.includes('windsurf'), 'windsurf absent (no .windsurf)');
    assert.ok(absent.includes('gemini'), 'gemini absent (no .gemini)');
    assert.ok(absent.includes('antigravity'), 'antigravity absent (no .agents)');

    // The .claude-rooted agents are never auto-seeded — ambiguous with a global
    // or Claude Code plugin install — even though .claude/ exists here.
    for (const k of ['claude', 'cline']) {
      assert.ok(!present.includes(k) && !absent.includes(k), `${k} excluded from 'all'`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("`all` installs to every present agent dir, skips absent, never auto-seeds .claude", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-all-'));
  try {
    // Three present agent homes (cursor, copilot, the shared .agents group) and
    // a present-but-excluded .claude.
    fs.mkdirSync(path.join(tmp, '.cursor'));
    fs.mkdirSync(path.join(tmp, '.github'));
    fs.mkdirSync(path.join(tmp, '.agents'));
    fs.mkdirSync(path.join(tmp, '.claude'));

    const res = runInstall('all', tmp);
    assert.equal(res.status, 0, `'all' must pass:\n${res.stdout}${res.stderr}`);

    // Installed into each present agent's own dir.
    assert.ok(fs.existsSync(path.join(tmp, '.cursor', 'skills', 'rot-canary', 'SKILL.md')), 'cursor skills installed');
    assert.ok(fs.existsSync(path.join(tmp, '.github', 'skills', 'rot-canary', 'SKILL.md')), 'copilot skills installed');
    assert.ok(fs.existsSync(path.join(tmp, '.agents', 'skills', 'rot-canary', 'SKILL.md')), '.agents group skills installed');

    // Absent agents get nothing; excluded .claude is never auto-seeded.
    assert.ok(!fs.existsSync(path.join(tmp, '.windsurf')), 'absent windsurf untouched');
    assert.ok(!fs.existsSync(path.join(tmp, '.gemini')), 'absent gemini untouched');
    assert.ok(!fs.existsSync(path.join(tmp, '.claude', 'skills')), '.claude never auto-seeded by all');

    assert.match(res.stdout, /detected:/, "reports what it detected");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
