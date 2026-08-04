// CoalMine render core unit tests — node:test built-in, zero dependencies.
// Run: node --test scripts/lib/render.test.mjs
// Covers: marker injection, intent placeholders, missing-meta fallback,
// recursive skill-dir copy, and the verify.mjs stale-dist negative path.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inject, renderSkillMd, installSkillDir, listSkills, SHARED_REFERENCES } from './render.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHARED = {
  languageHeader: 'LANG-HEADER',
  orchestration: 'ORCH {{LIGHT_INTENT}}|{{STANDARD_INTENT}}|{{HEAVY_INTENT}}',
  escalationFooter: 'ESC-FOOTER',
};

function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('inject replaces every SHARED marker', () => {
  const src = [
    '<!-- SHARED:LANGUAGE_HEADER -->',
    'body',
    '<!-- SHARED:ORCHESTRATION -->',
    '<!-- SHARED:ESCALATION_FOOTER -->',
  ].join('\n');
  const out = inject(src, SHARED, { lightIntent: 'L', standardIntent: 'S', heavyIntent: 'H' });
  assert.ok(!out.includes('<!-- SHARED:'), 'no unresolved markers may remain');
  assert.ok(out.includes('LANG-HEADER'));
  assert.ok(out.includes('ESC-FOOTER'));
});

test('inject fills intent placeholders from meta', () => {
  const out = inject('<!-- SHARED:ORCHESTRATION -->', SHARED, {
    lightIntent: 'quick check',
    standardIntent: 'balanced',
    heavyIntent: 'full fan-out',
  });
  assert.equal(out, 'ORCH quick check|balanced|full fan-out');
});

test('inject defaults missing intents to empty string', () => {
  const out = inject('<!-- SHARED:ORCHESTRATION -->', SHARED, {});
  assert.equal(out, 'ORCH ||');
});

test('renderSkillMd works without skill-meta.json', () => {
  const dir = mkTmp('cm-render-');
  try {
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '<!-- SHARED:LANGUAGE_HEADER -->\nhello', 'utf8');
    const out = renderSkillMd(dir, SHARED);
    assert.equal(out, 'LANG-HEADER\nhello');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkillDir copies nested subdirectories recursively', () => {
  const src = mkTmp('cm-src-');
  const dst = mkTmp('cm-dst-');
  try {
    fs.writeFileSync(path.join(src, 'SKILL.md'), '<!-- SHARED:LANGUAGE_HEADER -->', 'utf8');
    fs.writeFileSync(path.join(src, 'skill-meta.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(src, 'references', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(src, 'references', 'a.md'), 'ref-a', 'utf8');
    fs.writeFileSync(path.join(src, 'references', 'deep', 'b.md'), 'ref-b', 'utf8');

    const to = path.join(dst, 'myskill');
    installSkillDir(src, to, SHARED);

    assert.equal(fs.readFileSync(path.join(to, 'SKILL.md'), 'utf8'), 'LANG-HEADER');
    assert.equal(fs.readFileSync(path.join(to, 'references', 'a.md'), 'utf8'), 'ref-a');
    assert.equal(fs.readFileSync(path.join(to, 'references', 'deep', 'b.md'), 'utf8'), 'ref-b');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dst, { recursive: true, force: true });
  }
});

test('installSkillDir writes shared references verbatim, alongside a skill that has none of its own', () => {
  const src = mkTmp('cm-src-');
  const dst = mkTmp('cm-dst-');
  try {
    // A skill with NO references/ dir of its own — the shared ref must still land.
    fs.writeFileSync(path.join(src, 'SKILL.md'), '<!-- SHARED:LANGUAGE_HEADER -->', 'utf8');
    const shared = { ...SHARED, sharedReferences: { 'escalation.md': 'SHARED-REF-BODY\n' } };

    const to = path.join(dst, 'myskill');
    installSkillDir(src, to, shared);

    assert.equal(fs.readFileSync(path.join(to, 'references', 'escalation.md'), 'utf8'), 'SHARED-REF-BODY\n');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dst, { recursive: true, force: true });
  }
});

test('installSkillDir injects shared references without clobbering the skill\'s own references', () => {
  const src = mkTmp('cm-src-');
  const dst = mkTmp('cm-dst-');
  try {
    fs.writeFileSync(path.join(src, 'SKILL.md'), '<!-- SHARED:LANGUAGE_HEADER -->', 'utf8');
    fs.mkdirSync(path.join(src, 'references'), { recursive: true });
    fs.writeFileSync(path.join(src, 'references', 'own.md'), 'own-ref', 'utf8');
    const shared = { ...SHARED, sharedReferences: { 'escalation.md': 'SHARED-REF' } };

    const to = path.join(dst, 'myskill');
    installSkillDir(src, to, shared);

    assert.equal(fs.readFileSync(path.join(to, 'references', 'own.md'), 'utf8'), 'own-ref');
    assert.equal(fs.readFileSync(path.join(to, 'references', 'escalation.md'), 'utf8'), 'SHARED-REF');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dst, { recursive: true, force: true });
  }
});

test('SHARED_REFERENCES is a non-empty list of {name, src} entries', () => {
  assert.ok(Array.isArray(SHARED_REFERENCES) && SHARED_REFERENCES.length >= 1);
  for (const r of SHARED_REFERENCES) {
    assert.equal(typeof r.name, 'string');
    assert.ok(r.name.length > 0);
    assert.ok(r.src.endsWith(r.name), `src ${r.src} should end with name ${r.name}`);
  }
});

test('verify.mjs negative path: stale dist fails, clean copy passes', () => {
  const tmp = mkTmp('cm-verify-');
  try {
    for (const d of ['skills', 'plugin', 'scripts', '.claude-plugin', 'hooks', 'agents', 'commands', 'alt']) {
      fs.cpSync(path.join(repo, d), path.join(tmp, d), { recursive: true });
    }
    const run = () => spawnSync(process.execPath, [path.join(tmp, 'scripts', 'verify.mjs')], { encoding: 'utf8' });

    const clean = run();
    assert.equal(clean.status, 0, `pristine copy must PASS, got:\n${clean.stdout}${clean.stderr}`);

    const firstSkill = listSkills(path.join(tmp, 'skills'))[0];
    fs.appendFileSync(path.join(tmp, 'skills', firstSkill, 'SKILL.md'), '\nstale-byte\n');
    const stale = run();
    assert.equal(stale.status, 1, 'stale dist must FAIL with exit 1');
    assert.ok(stale.stdout.includes('STALE'), 'failure output names the stale skill');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// INSPECT task #38, HIGH: dist-changelog's own 11 unit tests all call checkDistChangelog
// directly — none of them proves it is actually WIRED into verify.mjs. Reverting the 2.8
// block to `const findings = [];` left the whole suite green (167/165/0/2) with nothing to
// catch it. This asserts the COMPOSITION, the same way the stale-dist test above asserts
// verify.mjs's dist-sync composition rather than just render.mjs's own rendering logic.
//
// Needs a REAL git repo with a real tag (the plain fs.cpSync copy above has no .git at
// all, so checkDistChangelog would only ever hit the "not a git repository" SKIP there) —
// a second, separate tmp fixture, git-initialized and tagged to match the copied
// CHANGELOG.md's own top heading (`v3.14.0`, this room's real last tag at fixture-build
// time) so the heading-vs-tag compare exercises the same real branch it does live.
//
// The dist mutation bumps `version` in BOTH `.claude-plugin/plugin.json` and its
// `plugin/` copy identically — keeps verify.mjs's own source-vs-dist sync check green
// (same technique proven clean at the live tree during this task's manual RED-first
// probe) so only checkDistChangelog's tag-diff fires, isolating the wiring assertion
// from every OTHER thing verify.mjs checks.
test('verify.mjs 2.8 dist-changelog: a dist change with no CHANGELOG entry fails the WHOLE gate — proves the wiring, not just the module', () => {
  const tmp = mkTmp('cm-verify-distchangelog-');
  try {
    for (const d of ['skills', 'plugin', 'scripts', '.claude-plugin', 'hooks', 'agents', 'commands', 'alt']) {
      fs.cpSync(path.join(repo, d), path.join(tmp, d), { recursive: true });
    }
    fs.copyFileSync(path.join(repo, 'CHANGELOG.md'), path.join(tmp, 'CHANGELOG.md'));

    const git = (args) => {
      const r = spawnSync('git', args, { cwd: tmp, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.error?.message}`);
      return r.stdout;
    };
    git(['init', '-q', '-b', 'main']);
    git(['config', 'user.email', 'test@test.invalid']);
    git(['config', 'user.name', 'Test']);
    git(['config', 'commit.gpgsign', 'false']);
    // A machine-global tag.gpgSign/tag.forceSignAnnotated would force a bare `git tag
    // <name>` into an annotated, signed tag needing a message, failing non-interactively
    // with "fatal: no tag message?" — the exact fixture defect INSPECT's own RED-first
    // run hit in dist-changelog.test.mjs before it was fixed there. Same guard here.
    git(['config', 'tag.gpgSign', 'false']);
    git(['config', 'tag.forceSignAnnotated', 'false']);
    git(['add', '-A']);
    git(['commit', '-q', '-m', 'baseline']);
    git(['tag', 'v3.14.0']);

    const run = () => spawnSync(process.execPath, [path.join(tmp, 'scripts', 'verify.mjs')], { encoding: 'utf8' });

    const clean = run();
    assert.equal(clean.status, 0, `freshly-tagged copy must PASS, got:\n${clean.stdout}${clean.stderr}`);
    assert.match(clean.stdout, /dist-changelog:\s*\n\s*ok/, 'the 2.8 block must be present and green on a clean copy');

    const bump = (p) => fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('"3.14.0"', '"3.14.0-redprobe"'));
    bump(path.join(tmp, '.claude-plugin', 'plugin.json'));
    bump(path.join(tmp, 'plugin', '.claude-plugin', 'plugin.json'));

    const withoutEntry = run();
    assert.equal(withoutEntry.status, 1, 'a dist change with no CHANGELOG entry must fail the WHOLE gate, not just the module in isolation');
    assert.match(withoutEntry.stdout, /FAIL dist-changelog: plugin\/ dist differs from v3\.14\.0 .*CHANGELOG\.md's top heading is still \[3\.14\.0\]/);

    const changelog = fs.readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8');
    fs.writeFileSync(path.join(tmp, 'CHANGELOG.md'), changelog.replace('## [3.14.0]', '## [Unreleased]\n\n### Fixed\n- test entry\n\n## [3.14.0]'));
    const withEntry = run();
    assert.match(withEntry.stdout, /dist-changelog:\s*\n\s*ok/, 'documenting it in [Unreleased] clears the SAME composition-level check');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
