// Unit tests for the self-consistency + manifest-integrity layers.
// Zero-dep (node:test + built-ins), per scripts-quality.md section 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkCanaryCount, checkConductorCanaryCount, checkAgentCount, checkVersionPins, checkDoctrineMirrors, checkRuleStamps } from './consistency.mjs';
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

test('conductor canary count: passes when hooks/coalmine-conductor.js matches skills/, fails on drift', () => {
  const dir = mkRepo();
  try {
    fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true });
    const mkConductor = (n) => fs.writeFileSync(
      path.join(dir, 'hooks', 'coalmine-conductor.js'),
      `const CONDUCTOR_HEAD = [\n  '[CoalMine] ${n} quality canaries installed. Conduct them:',\n];\n`,
    );

    mkConductor(2); // mkRepo() ships 2 skills (alpha-canary, beta-canary)
    assert.deepEqual(checkConductorCanaryCount(dir), [], 'matching count is clean');

    mkConductor(9);
    const drift = checkConductorCanaryCount(dir);
    assert.equal(drift.length, 1);
    assert.match(drift[0].msg, /conductor hook says 9 .* skills\/ has 2/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('conductor canary count: missing string fails loud instead of silently passing', () => {
  const dir = mkRepo();
  try {
    fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'hooks', 'coalmine-conductor.js'), '// no canary-count string here\n');
    const f = checkConductorCanaryCount(dir);
    assert.equal(f.length, 1);
    assert.match(f[0].msg, /no "<N> quality canaries installed" string/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('agent count: README table rows must match targets.mjs, fails on drift', () => {
  const dir = mkRepo();
  try {
    fs.mkdirSync(path.join(dir, 'scripts', 'lib'), { recursive: true });
    const mkTargets = (names) => `import path from 'node:path';\nexport const TARGETS = {\n${names.map((n) => `  ${n}: path.join('x'),`).join('\n')}\n};\n`;
    const mkReadme = (names) => `# x\n\n## Universal Agent Support\n\n| AI Agent | Target Skills Folder | Shortcut | Tool |\n|---|---|---|---|\n${names.map((n) => `| **${n}** | \`.${n}/skills\` | cmd | tool |`).join('\n')}\n\ndone\n`;
    fs.writeFileSync(path.join(dir, 'scripts', 'lib', 'targets.mjs'), mkTargets(['alpha', 'beta', 'gamma']));

    fs.writeFileSync(path.join(dir, 'README.md'), mkReadme(['alpha', 'beta', 'gamma']));
    assert.deepEqual(checkAgentCount(dir), [], 'matching count is clean');

    fs.writeFileSync(path.join(dir, 'README.md'), mkReadme(['alpha', 'beta', 'gamma', 'delta']));
    const drift = checkAgentCount(dir);
    assert.equal(drift.length, 1);
    assert.match(drift[0].msg, /4 rows but targets\.mjs defines 3/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('version pins: a `version-pin:` line must match plugin.json; drift/missing fail, prose mention ignored', () => {
  const dir = mkRepo();
  try {
    fs.mkdirSync(path.join(dir, '.github', 'ISSUE_TEMPLATE'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '3.7.0', description: 'x' }));
    const tpl = path.join(dir, '.github', 'ISSUE_TEMPLATE', 'bug.yml');
    const mkTpl = (line) => fs.writeFileSync(tpl, `name: bug\nbody:\n  - type: input\n    attributes:\n      ${line}\n`);

    mkTpl('placeholder: "v3.7.0 on Windows"  # version-pin: tracks plugin.json');
    assert.deepEqual(checkVersionPins(dir), [], 'matching pin is clean');

    mkTpl('placeholder: "v3.6.0 on Windows"  # version-pin: tracks plugin.json');
    const drift = checkVersionPins(dir);
    assert.equal(drift.length, 1);
    assert.match(drift[0].msg, /pins v3\.6\.0 but plugin\.json is v3\.7\.0/);

    mkTpl('placeholder: "no version here"  # version-pin: tracks plugin.json');
    const nover = checkVersionPins(dir);
    assert.equal(nover.length, 1);
    assert.match(nover[0].msg, /no vX\.Y\.Z/);

    // a prose mention of the word `version-pin` (no colon) is NOT a pin
    mkTpl('description: "see the version-pin docs, e.g. v9.9.9 examples"');
    assert.deepEqual(checkVersionPins(dir), [], 'non-colon prose mention is ignored');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctrine mirrors: identical copies pass, a diverged copy fails', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
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

test('doctrine mirrors: a MALFORMED rule home fails closed — only a genuinely ABSENT one gets the carve-out', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');

    // The fail-OPEN hole this closes: a regular FILE where the counterpart TREE belongs
    // read as "absent", so the carve-out fired and the whole guard was bypassed in
    // silence while .claude genuinely held rules.
    fs.mkdirSync(path.join(dir, '.agents/rules'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.agents/rules/ecc'), 'not a directory\n');
    const notdir = checkDoctrineMirrors(dir);
    assert.equal(notdir.length, 1, 'a file where the rule home belongs must be reported, not swallowed');
    assert.match(notdir[0].msg, /is NOT a directory/);

    // A PARENT that is a file is still a real absence. NOTE the errno differs by
    // platform — POSIX raises ENOTDIR, Windows raises ENOENT — so this leg exercises
    // the ENOTDIR arm of the classification only on the Unix CI runners while passing
    // here through the ENOENT arm. Both are the same verdict, which is why one
    // assertion covers both; the ENOTDIR arm is NOT dead code, it is just not
    // reachable on this volume.
    fs.rmSync(path.join(dir, '.agents/rules/ecc'));
    fs.rmSync(path.join(dir, '.agents/rules'), { recursive: true, force: true });
    fs.writeFileSync(path.join(dir, '.agents/rules'), 'parent is a file\n');
    assert.deepEqual(checkDoctrineMirrors(dir), [], 'ENOTDIR through a file parent = the home really is not there');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// SEPARATE test, deliberately: this leg cannot run on every volume, and folding it into
// the one above made t.skip mark the WHOLE test skipped — so the malformed-home
// assertions that DID run reported as "skipped" on Windows. One skippable leg must never
// hide a leg that ran.
test('doctrine mirrors: an UNINSPECTABLE rule home fails closed (Unix CI runners; skips where stat cannot be denied)', (t) => {
  const dir = mkRepo();
  const guarded = path.join(dir, '.agents/rules');
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    mk('.agents/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');

    // chmod is a no-op on NTFS and needs Developer Mode for some ops, so the denial is
    // PROBED, never assumed from process.platform (a volume property, not a platform one).
    let denied = false;
    try {
      fs.chmodSync(guarded, 0o000);
      fs.statSync(path.join(dir, '.agents/rules/ecc'));
    } catch (e) {
      denied = e.code !== 'ENOENT' && e.code !== 'ENOTDIR';
    }
    if (!denied) {
      t.skip('this volume cannot deny stat (chmod no-op on NTFS / needs Developer Mode) — this leg runs on the Unix CI runners');
      return;
    }
    const unreadable = checkDoctrineMirrors(dir);
    assert.equal(unreadable.length, 1, 'an uninspectable rule home must fail closed, not read as absent');
    assert.match(unreadable[0].msg, /could not be inspected/);
  } finally {
    try { fs.chmodSync(guarded, 0o700); } catch { /* best effort, so cleanup can recurse */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The tri-state above hardened the stat PROBE. A guard rests on TWO capability checks
// — the probe AND the enumeration — and hardening one leaves the other: a swallowed
// readdir failure yields an empty tree, so two genuinely DIVERGED homes report
// agreement over zero files compared. POSIX `chmod 0100` is exactly that state (stat
// succeeds, readdir does not). Patching the `node:fs` default export reaches the
// module under test — one realm, one singleton object — so this leg runs on EVERY
// volume instead of only where permissions can be denied. No skippable leg here.
test('doctrine mirrors: an UNENUMERABLE rule home fails loud — a readdir failure is not an empty tree', () => {
  const dir = mkRepo();
  const realReaddir = fs.readdirSync;
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    mk('.agents/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\nPOISON\n');
    assert.equal(checkDoctrineMirrors(dir).length, 1, 'control: the divergence is visible while the tree can be read');

    // Both roots still stat as directories; only the nested readdir fails, so the walk
    // is blinded MID-WALK and the recursion — not just the root — has to carry the guard.
    fs.readdirSync = (p, opts) => {
      if (path.basename(String(p)) === 'domain') {
        const e = new Error('EACCES: permission denied, scandir'); e.code = 'EACCES'; throw e;
      }
      return realReaddir(p, opts);
    };
    const blind = checkDoctrineMirrors(dir);
    assert.equal(blind.length, 2, 'each unenumerable rule home is reported — never a silent all-clear over zero files compared');
    for (const root of ['.claude/rules/ecc', '.agents/rules/ecc']) {
      assert.ok(blind.some((f) => f.msg.includes(root) && /could not be enumerated/.test(f.msg)), `${root} must be named as unenumerable`);
    }

    // ONE walker, BOTH callers: the stamp check consumed the same swallow.
    const stamps = checkRuleStamps(dir);
    assert.equal(stamps.length, 2, 'checkRuleStamps shares walkMd and must fail loud on the same blindness');
    assert.match(stamps[0].msg, /could not be enumerated/);
  } finally {
    fs.readdirSync = realReaddir;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// SEPARATE test: creating a link is a volume capability, so this carries the one
// skippable leg and nothing else (t.skip marks the WHOLE test, not the leg).
test('doctrine mirrors: a DANGLING link at a rule home is MALFORMED, not absent (skips where the volume cannot make a link)', (t) => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    fs.mkdirSync(path.join(dir, '.agents/rules'), { recursive: true });
    try {
      // 'junction' is the unprivileged Windows shim (a plain symlink needs Developer
      // Mode; measured EPERM here) and the type arg is ignored on POSIX. PROBED, never
      // keyed to process.platform — link permission is a volume property.
      fs.symlinkSync(path.join(dir, 'no-such-rule-home'), path.join(dir, '.agents/rules/ecc'), 'junction');
    } catch (e) {
      t.skip(`this volume cannot create a link (${e.code}) — this leg runs where one can`);
      return;
    }
    // statSync FOLLOWS the link and reports the missing target as ENOENT, which the
    // carve-out would read as "this clone does not keep that rule home" — while the
    // directory ENTRY is sitting right there. Only lstat separates no-home-here from
    // a broken one, and a broken one is malformed, never the carve-out.
    const f = checkDoctrineMirrors(dir);
    assert.equal(f.length, 1, 'a link that promises a rule home and delivers nothing must not inherit the ABSENT carve-out');
    assert.match(f[0].msg, /is NOT a directory/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctrine mirrors: ENUMERATED, not a pair list — a nested rule and a brand-new rule are both compared', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    // The live defect this replaced: the hard-coded list named 2 files, so common/,
    // node/, typescript/ and RETIRED.md were never compared and drift read as clean.
    for (const rel of ['domain/hooks-safety.md', 'common/coding-style.md', 'node/runtime.md', 'RETIRED.md']) {
      mk(`.claude/rules/ecc/${rel}`, `RULE ${rel}\n`);
      mk(`.agents/rules/ecc/${rel}`, `RULE ${rel}\n`);
    }
    assert.deepEqual(checkDoctrineMirrors(dir), [], 'a fully mirrored tree is clean');

    // A rule added on the Claude side only — the shape of every future rule addition.
    mk('.claude/rules/ecc/typescript/testing.md', 'NEW RULE\n');
    const added = checkDoctrineMirrors(dir);
    assert.equal(added.length, 1, 'the newly-added rule must be compared without touching this check');
    assert.match(added[0].msg, /typescript\/testing\.md.*UNMIRRORED/);
    fs.rmSync(path.join(dir, '.claude/rules/ecc/typescript/testing.md'));

    // Nested content drift, in a directory the old pair list never named.
    fs.writeFileSync(path.join(dir, '.agents/rules/ecc/common/coding-style.md'), 'RULE common/coding-style.md\nPOISON\n');
    const drift = checkDoctrineMirrors(dir);
    assert.equal(drift.length, 1);
    assert.match(drift[0].msg, /common\/coding-style\.md.*DIVERGED/);
    fs.writeFileSync(path.join(dir, '.agents/rules/ecc/common/coding-style.md'), 'RULE common/coding-style.md\n');

    // RETIRED.md is deliberately NOT exempt: never @imported is not "may disagree".
    fs.rmSync(path.join(dir, '.agents/rules/ecc/RETIRED.md'));
    assert.match(checkDoctrineMirrors(dir)[0].msg, /RETIRED\.md.*UNMIRRORED/, 'RETIRED.md mirrors like any other rule — no carve-out');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('doctrine mirrors: the two absences are DIFFERENT — whole tree absent is silent, tree present but incomplete FAILs', () => {
  const dir = mkRepo();
  try {
    const mk = (rel, body) => { fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
    mk('.claude/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    mk('.claude/rules/ecc/common/testing.md', 'RULE\n');

    // (1) No .agents rule home at all — a clone that never installed it. SILENT.
    assert.deepEqual(checkDoctrineMirrors(dir), [], 'the whole counterpart tree being absent is the legitimate carve-out');

    // (2) The tree EXISTS but is missing a file — drift wearing the costume of (1). FAIL.
    mk('.agents/rules/ecc/domain/hooks-safety.md', 'DOCTRINE\n');
    const partial = checkDoctrineMirrors(dir);
    assert.equal(partial.length, 1, 'a present-but-incomplete tree must not inherit the carve-out');
    assert.match(partial[0].msg, /common\/testing\.md.*MISSING from \.agents/);

    // (3) Reverse direction: a rule only the non-Claude agents can see is the same defect.
    mk('.agents/rules/ecc/common/testing.md', 'RULE\n');
    mk('.agents/rules/ecc/common/agents-only.md', 'RULE\n');
    const reverse = checkDoctrineMirrors(dir);
    assert.equal(reverse.length, 1);
    assert.match(reverse[0].msg, /agents-only\.md.*MISSING from \.claude/);
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
    // POSIX `../` and absolute keys escape on every platform; the Windows-only
    // `..\` key (which slipped past the old `/`-split segment guard) is a real
    // traversal only where `\` is a separator — on POSIX it is a valid filename,
    // so it is asserted on win32 only.
    const evilKeys = ['../../etc/passwd', '/etc/passwd'];
    if (process.platform === 'win32') evilKeys.push('..\\..\\evil');
    for (const evil of evilKeys) {
      fs.writeFileSync(path.join(dest, MANIFEST_NAME), JSON.stringify({
        version: '9.9.9', skills: ['x'], hashes: { [evil]: 'deadbeef' },
      }));
      const r = verifyAgainstManifest(dest);
      assert.ok(r.findings.some((x) => /traversal/.test(x.msg)), `traversal entry ${JSON.stringify(evil)} must be rejected`);
      assert.equal(r.checked, 0, `escaping entry ${JSON.stringify(evil)} must never be hashed`);
    }
  } finally { fs.rmSync(dest, { recursive: true, force: true }); }
});
