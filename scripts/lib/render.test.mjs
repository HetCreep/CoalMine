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
import { inject, renderSkillMd, installSkillDir, listSkills } from './render.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHARED = {
  languageHeader: 'LANG-HEADER',
  contexts: 'CONTEXTS-BODY',
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
    '<!-- SHARED:CONTEXTS -->',
    '<!-- SHARED:ORCHESTRATION -->',
    '<!-- SHARED:ESCALATION_FOOTER -->',
  ].join('\n');
  const out = inject(src, SHARED, { lightIntent: 'L', standardIntent: 'S', heavyIntent: 'H' });
  assert.ok(!out.includes('<!-- SHARED:'), 'no unresolved markers may remain');
  assert.ok(out.includes('LANG-HEADER'));
  assert.ok(out.includes('CONTEXTS-BODY'));
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
    fs.writeFileSync(path.join(src, 'SKILL.md'), '<!-- SHARED:CONTEXTS -->', 'utf8');
    fs.writeFileSync(path.join(src, 'skill-meta.json'), '{}', 'utf8');
    fs.mkdirSync(path.join(src, 'references', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(src, 'references', 'a.md'), 'ref-a', 'utf8');
    fs.writeFileSync(path.join(src, 'references', 'deep', 'b.md'), 'ref-b', 'utf8');

    const to = path.join(dst, 'myskill');
    installSkillDir(src, to, SHARED);

    assert.equal(fs.readFileSync(path.join(to, 'SKILL.md'), 'utf8'), 'CONTEXTS-BODY');
    assert.equal(fs.readFileSync(path.join(to, 'references', 'a.md'), 'utf8'), 'ref-a');
    assert.equal(fs.readFileSync(path.join(to, 'references', 'deep', 'b.md'), 'utf8'), 'ref-b');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dst, { recursive: true, force: true });
  }
});

test('verify.mjs negative path: stale dist fails, clean copy passes', () => {
  const tmp = mkTmp('cm-verify-');
  try {
    for (const d of ['skills', 'plugin', 'scripts', '.claude-plugin', 'hooks']) {
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
