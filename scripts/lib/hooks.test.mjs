// CoalMine rot-canary hook tests — node:test built-in, zero dependencies.
// Run: node --test scripts/lib/hooks.test.mjs
// Spawns the real hooks with fixture stdin and a sandboxed TEMP so no real
// session state is touched. Covers: touch record + case-insensitive dedup,
// fail-silent on garbage, stop nudge emit, acknowledged-batch cleanup.
// waiver: intentional single hermetic spawn-suite >800 lines — split only if it
// keeps growing; the gate (scripts/test.mjs) enumerates explicit files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOUCH = path.join(repo, 'hooks', 'rot-canary-touch.js');
const STOP = path.join(repo, 'hooks', 'rot-canary-stop.js');
const CONDUCTOR = path.join(repo, 'hooks', 'coalmine-conductor.js');

function runHook(script, input, tmp, args = [], cwd = tmp) {
  // TEMP/TMP/TMPDIR → sandbox os.tmpdir(); USERPROFILE/HOME → sandbox os.homedir()
  // so the real ~/.claude/.rot-canary-mode can never affect the test (mode = auto default).
  // args: the AG hooks.json template passes the event name as argv (AG mode); CC passes none.
  // cwd: defaults to the same sandbox dir as TEMP/TMP/TMPDIR (every existing caller is
  // unaffected); a test exercising the os.tmpdir()-exclusion guard passes a SEPARATE
  // project dir here, since loadCfg()'s project-config lookup keys off raw process.cwd().
  return spawnSync(process.execPath, [script, ...args], {
    input,
    encoding: 'utf8',
    cwd,
    env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp, USERPROFILE: tmp, HOME: tmp },
  });
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-hooktest-'));
}

// Mirrors hooks/coalmine-conductor.js's djb2 (test-local — the hook doesn't
// export it). Lets a test plant the EXACT marker path the hook would compute
// for a given session key, to test the EEXIST branch directly.
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

test('conductor injects offer rules, and .coalmine.json can silence it', () => {
  const tmp = mkTmp();
  try {
    const on = runHook(CONDUCTOR, '', tmp);
    assert.equal(on.status, 0);
    assert.ok(on.stdout.includes('[CoalMine]'), 'conductor must emit the offer rules');
    assert.ok(on.stdout.includes('gold-standard'), 'onboarding offer rule present');

    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ enableConductor: false }), 'utf8');
    const off = runHook(CONDUCTOR, '', tmp);
    assert.equal(off.status, 0);
    assert.equal(off.stdout, '', 'conductor:false must silence the injection');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('conductor drops only the onboarding line when skipOnboarding is set', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ skipOnboarding: true }), 'utf8');
    const r = runHook(CONDUCTOR, '', tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('[CoalMine]'), 'rest of the conductor still injects');
    assert.ok(r.stdout.includes('Specialists'), 'specialist offers still present');
    assert.ok(!r.stdout.includes('offer /gold-standard ONCE'), 'gold-standard onboarding offer is dropped');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('conductor auto-suppresses onboarding once a coalmine: verified stamp exists anywhere in the rule roots (HOOK-LEAN, no manual skipOnboarding needed)', () => {
  const tmp = mkTmp();
  try {
    const rulesDir = path.join(tmp, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'gold-standard.md'), '<!-- coalmine: verified 2026-07-01 revalidate 90d -->\n', 'utf8');
    const r = runHook(CONDUCTOR, '', tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('[CoalMine]'), 'rest of the conductor still injects');
    assert.ok(r.stdout.includes('Specialists'), 'specialist offers still present');
    assert.ok(!r.stdout.includes('offer /gold-standard ONCE'), 'a verified stamp anywhere auto-suppresses the onboarding offer');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('project .coalmine.json can disable the canary', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ disabledCanaries: ['rot-canary'] }), 'utf8');
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'CFG', tool_input: { file_path: 'C:\\proj\\a.js' } }), tmp);
    assert.equal(r.status, 0);
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-CFG.touched')), 'disabled canary must record nothing');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook records edited code file and exits 0', () => {
  const tmp = mkTmp();
  try {
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T1', tool_input: { file_path: 'C:\\proj\\a.js' } }), tmp);
    assert.equal(r.status, 0);
    const touched = path.join(tmp, 'rot-canary-T1.touched');
    assert.ok(fs.existsSync(touched), '.touched file must be created in sandbox TEMP');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('a.js'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch + stop reject a traversal-shaped session_id (Phoenix #10 sandbox guard)', () => {
  const tmp = mkTmp();
  const evil = '../../../etc/cmhooktest-target';
  const escaped = path.join(tmp, 'rot-canary-' + evil) + '.touched'; // resolves OUTSIDE the sandbox tmpdir
  try {
    const r = runHook(TOUCH, JSON.stringify({ session_id: evil, tool_input: { file_path: 'C:\\proj\\a.js' } }), tmp);
    assert.equal(r.status, 0, 'touch is fail-silent on a bad sid (Phoenix #4)');
    assert.ok(!fs.existsSync(escaped), 'touch wrote NO file outside the sandbox tmpdir');
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-' + evil + '.touched')), 'nothing written for a rejected sid');
    const s = runHook(STOP, JSON.stringify({ session_id: evil, stop_hook_active: false }), tmp);
    assert.equal(s.status, 0, 'stop is fail-silent on a bad sid');
  } finally {
    try { fs.rmSync(escaped, { force: true }); } catch {} // clean if a regression let it escape
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook dedups case-insensitively on win32 and never crashes', () => {
  const tmp = mkTmp();
  try {
    runHook(TOUCH, JSON.stringify({ session_id: 'T2', tool_input: { file_path: 'C:\\proj\\App.js' } }), tmp);
    runHook(TOUCH, JSON.stringify({ session_id: 'T2', tool_input: { file_path: 'C:\\proj\\app.js' } }), tmp);
    const lines = fs.readFileSync(path.join(tmp, 'rot-canary-T2.touched'), 'utf8').split('\n').filter(Boolean);
    if (process.platform === 'win32') {
      assert.equal(lines.length, 1, 'same path differing only by case must be recorded once on win32');
    } else {
      assert.equal(lines.length, 2);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('hooks are fail-silent: garbage and empty stdin exit 0 with no output', () => {
  const tmp = mkTmp();
  try {
    for (const input of ['not json {{{', '']) {
      const rt = runHook(TOUCH, input, tmp);
      assert.equal(rt.status, 0);
      assert.equal(rt.stdout, '');
      const rs = runHook(STOP, input, tmp);
      assert.equal(rs.status, 0);
      assert.equal(rs.stdout, '');
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook emits decision:block nudge listing touched files, filtering non-paths', () => {
  const tmp = mkTmp();
  try {
    const real = path.join(tmp, 'edited-a.js');
    fs.writeFileSync(real, 'x');
    const base = path.join(tmp, 'rot-canary-S1');
    // One real path + one garbage line — only the real one may surface.
    fs.writeFileSync(base + '.touched', real + '\n\u0000\u0001garbage-not-a-path\n');
    const stdin = JSON.stringify({ session_id: 'S1', stop_hook_active: false });

    const first = runHook(STOP, stdin, tmp);
    assert.equal(first.status, 0);
    const out = JSON.parse(first.stdout);
    assert.equal(out.decision, 'block');
    assert.ok(out.reason.includes('edited-a.js'), 'reason lists the touched file');
    assert.ok(!out.reason.includes('garbage-not-a-path'), 'garbage lines are filtered out');
    assert.ok(fs.existsSync(base + '.scanned'), 'one-shot marker written');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook cleans up session temp files once the batch is acknowledged', () => {
  const tmp = mkTmp();
  try {
    const base = path.join(tmp, 'rot-canary-S2');
    fs.writeFileSync(base + '.touched', 'C:\\proj\\a.js\n');
    fs.writeFileSync(base + '.smells', '');
    // The .scanned marker stores the .touched mtime captured at nudge time;
    // touched mtime <= stored value → batch acknowledged → cleanup.
    fs.writeFileSync(base + '.scanned', String(fs.statSync(base + '.touched').mtimeMs));

    const r = runHook(STOP, JSON.stringify({ session_id: 'S2', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', 'acknowledged batch must not re-nudge');
    for (const s of ['.touched', '.smells', '.scanned']) {
      assert.ok(!fs.existsSync(base + s), `${s} must be deleted (Phoenix #1 zero garbage)`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook honors language override in .coalmine.json', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ language: 'ja' }), 'utf8');
    const real = path.join(tmp, 'edited-a.js');
    fs.writeFileSync(real, 'x');
    const base = path.join(tmp, 'rot-canary-S3');
    fs.writeFileSync(base + '.touched', real + '\n');
    const stdin = JSON.stringify({ session_id: 'S3', stop_hook_active: false });

    const r = runHook(STOP, stdin, tmp);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.reason.includes('自動チェック'), 'nudge reason must be in Japanese');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook honors tripwireMaxFileSizeKb in .coalmine.json', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp) — the fixture must live OUTSIDE tmp now that touch excludes os.tmpdir()
  try {
    fs.writeFileSync(path.join(proj, '.coalmine.json'), JSON.stringify({ tripwireMaxFileSizeKb: 1 }), 'utf8');

    // Create a file larger than 1KB (e.g. 2KB)
    const largeFile = path.join(proj, 'large.js');
    fs.writeFileSync(largeFile, 'x'.repeat(2048));

    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T3', tool_input: { file_path: largeFile } }), tmp, [], proj);
    assert.equal(r.status, 0);

    // It should record the touched file path, but should NOT flag it as smell (smell scan is skipped)
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-T3.touched')), 'touched path is still recorded');
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-T3.smells')), 'large file smells check was skipped due to size cap');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('touch hook honors watchedExtensions override in .coalmine.json', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp)
  try {
    fs.writeFileSync(path.join(proj, '.coalmine.json'), JSON.stringify({ watchedExtensions: ['py', '.sh'] }), 'utf8');

    const fileJs = path.join(proj, 'file.js');
    fs.writeFileSync(fileJs, 'x');
    const filePy = path.join(proj, 'file.py');
    fs.writeFileSync(filePy, 'x');

    const r1 = runHook(TOUCH, JSON.stringify({ session_id: 'T4', tool_input: { file_path: fileJs } }), tmp, [], proj);
    assert.equal(r1.status, 0);
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-T4.touched')), 'unwatched JS file is ignored');

    const r2 = runHook(TOUCH, JSON.stringify({ session_id: 'T4', tool_input: { file_path: filePy } }), tmp, [], proj);
    assert.equal(r2.status, 0);
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-T4.touched')), 'watched PY file is recorded');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('touch hook honors tripwireMaxLines override in .coalmine.json', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp)
  try {
    fs.writeFileSync(path.join(proj, '.coalmine.json'), JSON.stringify({ tripwireMaxLines: 5 }), 'utf8');

    const fileLines = path.join(proj, 'lines.js');
    fs.writeFileSync(fileLines, 'x\n'.repeat(10)); // 11 lines

    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T5', tool_input: { file_path: fileLines } }), tmp, [], proj);
    assert.equal(r.status, 0);

    const smellsFile = path.join(tmp, 'rot-canary-T5.smells');
    assert.ok(fs.existsSync(smellsFile), 'smell file was created');
    assert.ok(fs.readFileSync(smellsFile, 'utf8').includes('file >5 lines'), 'triggered custom maxLines smell warning');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('touch hook clamps a negative tripwireMaxLines → no mass false-smell (Board-2 clamp)', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp)
  try {
    // raw -3 would flag EVERY file (lines > -3 is always true); clamped to >=1 a
    // 1-line file must NOT be flagged. Same clamp class as tripwireMaxFileSizeKb / ruleRevalidateDays.
    fs.writeFileSync(path.join(proj, '.coalmine.json'), JSON.stringify({ tripwireMaxLines: -3 }), 'utf8');
    const oneLine = path.join(proj, 'one.js');
    fs.writeFileSync(oneLine, 'x'); // 1 line, no trailing newline
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T5b', tool_input: { file_path: oneLine } }), tmp, [], proj);
    assert.equal(r.status, 0);
    const smellsFile = path.join(tmp, 'rot-canary-T5b.smells');
    const smells = fs.existsSync(smellsFile) ? fs.readFileSync(smellsFile, 'utf8') : '';
    assert.ok(!smells.includes('lines'), 'a negative tripwireMaxLines must not produce a line-count smell on a 1-line file');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('loadCfg parses JSONC with a backslash-terminated string before a later // string (no silent revert to defaults)', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp)
  try {
    // The comment-stripper used to desync here: a string value ending in a literal
    // backslash ("C:\\") leaked escape state, so a LATER string containing // was
    // mis-stripped → JSON.parse threw → catch{} reverted the WHOLE config to defaults.
    // This fixture must still parse so the tripwireMaxLines override is honored.
    const jsonc = [
      '{',
      '  // a comment line',
      '  "watchedExtensions": ["js"],',
      '  "schemaPaths": ["C:\\\\"],',           // value ends in one literal backslash
      '  "trustedDomains": ["http://example.com"], /* later // inside a string */',
      '  "tripwireMaxLines": 5',
      '}',
    ].join('\n');
    fs.writeFileSync(path.join(proj, '.coalmine.json'), jsonc, 'utf8');

    const fileLines = path.join(proj, 'lines.js');
    fs.writeFileSync(fileLines, 'x\n'.repeat(10)); // 11 lines > the override of 5

    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T6', tool_input: { file_path: fileLines } }), tmp, [], proj);
    assert.equal(r.status, 0);

    const smellsFile = path.join(tmp, 'rot-canary-T6.smells');
    assert.ok(fs.existsSync(smellsFile), 'config parsed: smell file created from the JSONC override');
    assert.ok(
      fs.readFileSync(smellsFile, 'utf8').includes('file >5 lines'),
      'tripwireMaxLines:5 honored — config did NOT silently revert to the default 800',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('stop hook honors autoScanFileCapSlice override in .coalmine.json', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ autoScanFileCap: 2, autoScanFileCapSlice: 1 }), 'utf8');
    
    const fileA = path.join(tmp, 'a.js');
    const fileB = path.join(tmp, 'b.js');
    const fileC = path.join(tmp, 'c.js');
    fs.writeFileSync(fileA, 'x');
    fs.writeFileSync(fileB, 'x');
    fs.writeFileSync(fileC, 'x');
    
    const base = path.join(tmp, 'rot-canary-S4');
    fs.writeFileSync(base + '.touched', `${fileA}\n${fileB}\n${fileC}\n`);
    
    const r = runHook(STOP, JSON.stringify({ session_id: 'S4', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    
    const out = JSON.parse(r.stdout);
    assert.ok(out.reason.includes('capped at 1 files'), 'warning notice dynamic interpolation maps new slice cap value');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook clamps autoScanFileCap:0 → no empty-list / "capped at 0" nudge (Board #2)', () => {
  // Before the read-time clamp, {autoScanFileCap:0, autoScanFileCapSlice:0} → files.slice(0,0)
  // → an empty file list + a "capped at 0 files" notice (a wasted, self-contradictory turn).
  // The clamp floors both at 1, so the nudge lists a real file and never says "capped at 0".
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ autoScanFileCap: 0, autoScanFileCapSlice: 0 }), 'utf8');
    const fileA = path.join(tmp, 'a.js');
    const fileB = path.join(tmp, 'b.js');
    fs.writeFileSync(fileA, 'x');
    fs.writeFileSync(fileB, 'x');
    const base = path.join(tmp, 'rot-canary-S5');
    fs.writeFileSync(base + '.touched', `${fileA}\n${fileB}\n`);

    const r = runHook(STOP, JSON.stringify({ session_id: 'S5', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, 'block');
    assert.ok(!out.reason.includes('capped at 0'), 'must NOT say "capped at 0" — the cap is clamped to 1');
    assert.ok(out.reason.includes('a.js') || out.reason.includes('b.js'), 'nudge must list at least one real file, never an empty list');
    // The list region (between the intro and any cap notice) carries a real "  - <file>" line.
    assert.ok(/\n {2}- .+\.js/.test(out.reason), 'a non-empty bullet list of files is present');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook clamps autoScanFileCapSlice:-1 → does NOT drop the last touched file (Board #2)', () => {
  // Before the clamp, {autoScanFileCap:2, autoScanFileCapSlice:-1} with 3 files → slice(0,-1)
  // silently kept "all but the last" + a "capped at -1 files" notice. The clamp floors the
  // slice at 1 → the notice reads "capped at 1 files" and the all-but-last drop is impossible.
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ autoScanFileCap: 2, autoScanFileCapSlice: -1 }), 'utf8');
    const fileA = path.join(tmp, 'a.js');
    const fileB = path.join(tmp, 'b.js');
    const fileC = path.join(tmp, 'c.js');
    fs.writeFileSync(fileA, 'x');
    fs.writeFileSync(fileB, 'x');
    fs.writeFileSync(fileC, 'x');
    const base = path.join(tmp, 'rot-canary-S6');
    fs.writeFileSync(base + '.touched', `${fileA}\n${fileB}\n${fileC}\n`);

    const r = runHook(STOP, JSON.stringify({ session_id: 'S6', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, 'block');
    assert.ok(!out.reason.includes('capped at -1'), 'must NOT emit a negative "-1" slice notice');
    assert.ok(out.reason.includes('capped at 1 files'), 'slice clamped to 1 (positive int), not the negative "all-but-last" behavior');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook does NOT sweep stale temp when the canary is disabled (a disabled canary does no work)', () => {
  const tmp = mkTmp();
  try {
    // A stale leftover from a crashed session (mtime ~99 days old → past the 7-day default).
    const stale = path.join(tmp, 'rot-canary-OLD.touched');
    fs.writeFileSync(stale, 'C:\\proj\\x.js\n');
    const old = Date.now() - 99 * 24 * 60 * 60 * 1000;
    fs.utimesSync(stale, new Date(old), new Date(old));
    // Canary disabled for this project.
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ disabledCanaries: ['rot-canary'] }), 'utf8');

    const r = runHook(STOP, JSON.stringify({ session_id: 'DIS', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', 'disabled canary emits no nudge');
    assert.ok(fs.existsSync(stale), 'disabled canary must skip the sweep — stale temp is left untouched');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook DOES sweep stale temp on the active (auto) path', () => {
  const tmp = mkTmp();
  try {
    // Same stale leftover, but the canary is active (default auto, no override).
    const stale = path.join(tmp, 'rot-canary-OLD.touched');
    fs.writeFileSync(stale, 'C:\\proj\\x.js\n');
    const old = Date.now() - 99 * 24 * 60 * 60 * 1000;
    fs.utimesSync(stale, new Date(old), new Date(old));
    // No .touched for THIS session → the hook sweeps, then bails (nothing to nudge).
    const r = runHook(STOP, JSON.stringify({ session_id: 'ACT', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(!fs.existsSync(stale), 'auto path sweeps stale temp older than the cutoff (Phoenix #1)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook clamps tempSweepStaleDays:-30 → does NOT delete a future-dated concurrent temp (board round-3 LOW)', () => {
  // Before the read-time clamp, {tempSweepStaleDays:-30} pushed the cutoff 30 days into the
  // FUTURE (cutoff = now - (-30)d = now + 30d), so `mtime < cutoff` held even for files NEWER
  // than now — the sweep deleted a concurrent session's live temp. Clamped to 0 → cutoff = now
  // → a file dated in the future survives. A future mtime is the observable that separates the
  // two: unclamped deletes it (< now+30d), clamped keeps it (not < now).
  const tmp = mkTmp();
  try {
    const future = path.join(tmp, 'rot-canary-CONCURRENT.touched');
    fs.writeFileSync(future, 'C:\\proj\\y.js\n');
    const ahead = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days ahead — inside the buggy 30d future window
    fs.utimesSync(future, new Date(ahead), new Date(ahead));
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ tempSweepStaleDays: -30 }), 'utf8');
    // No .touched for THIS session → the hook sweeps, then bails (nothing to nudge).
    const r = runHook(STOP, JSON.stringify({ session_id: 'CLAMP', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(fs.existsSync(future), 'a negative override must not push the cutoff into the future and delete a live temp');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("stop hook floors tempSweepStaleDays:0 to >=1 — must not delete this session's own recent marker (M1)", () => {
  // Before the >=1 floor, tempSweepStaleDays:0 pushed the sweep cutoff to "now".
  // sweepStale() runs BEFORE this session's own .touched is read below, so a
  // marker written moments earlier in the SAME session (already older than "now"
  // by the time the sweep runs) was deleted too — silently suppressing this
  // session's own end-of-scan nudge. Backdating by a few seconds (not a full day)
  // reproduces "recent but strictly before now" deterministically without relying
  // on process-spawn timing jitter.
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ tempSweepStaleDays: 0 }), 'utf8');
    const real = path.join(tmp, 'edited-a.js');
    fs.writeFileSync(real, 'x');
    const base = path.join(tmp, 'rot-canary-S7');
    fs.writeFileSync(base + '.touched', real + '\n');
    const recent = Date.now() - 5000;
    fs.utimesSync(base + '.touched', new Date(recent), new Date(recent));

    const r = runHook(STOP, JSON.stringify({ session_id: 'S7', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, 'block', 'tempSweepStaleDays:0 must not sweep away this session\'s own few-seconds-old marker');
    assert.ok(out.reason.includes('edited-a.js'), 'the nudge still lists the touched file');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- Two-level config (v3.9.0): global ~/.claude/.coalmine.json + project git-root file ---
// The sandbox maps USERPROFILE/HOME to tmp, so the global layer is <tmp>/.claude/.coalmine.json
// and the project layer is <tmp>/.coalmine.json (cwd = tmp, no .git → findGitRoot returns tmp).

test('GLOBAL .coalmine.json alone is honored (the layer that was previously never read)', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', '.coalmine.json'), JSON.stringify({ enableConductor: false }), 'utf8');
    const r = runHook(CONDUCTOR, '', tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', 'a global-layer enableConductor:false must silence the conductor with no project file present');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('project .coalmine.json overrides the global per key (project wins)', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', '.coalmine.json'), JSON.stringify({ enableConductor: false }), 'utf8');
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ enableConductor: true }), 'utf8');
    const r = runHook(CONDUCTOR, '', tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('[CoalMine]'), 'project enableConductor:true must win over the global false');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('merge drops __proto__/constructor/prototype keys (pollution cannot ride the overlay)', () => {
  const tmp = mkTmp();
  try {
    // An untrusted project config trying to smuggle enableConductor:false through __proto__:
    // the merge must drop the key entirely, so the conductor still emits.
    fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', '.coalmine.json'), JSON.stringify({ skipOnboarding: true }), 'utf8');
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), '{ "__proto__": { "enableConductor": false }, "constructor": { "x": 1 }, "prototype": { "y": 2 } }', 'utf8');
    const r = runHook(CONDUCTOR, '', tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('[CoalMine]'), 'proto-shaped keys must be dropped at merge, never honored');
    assert.ok(!r.stdout.includes('offer /gold-standard ONCE'), 'the global layer keys still apply through the merge');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- Antigravity adapter (AG mode = event-name argv, per platform-configs/hooks/
// antigravity-hooks.json). Same real hooks, spawned hermetically with AG-shaped
// fixture stdin in both casing variants (snake_case core / camelCase toolCall).

// The sanctioned AG PreInvocation output (contract re-derived 2026-07-23 from the
// installed engine): exactly {"injectSteps":[{"ephemeralMessage": ...}]} — the
// pilot-era flat additionalContext key is a dead letter in the engine and must
// never appear (nor the CC decision protocol; the key-set assert covers both).
function agInject(stdout) {
  const out = JSON.parse(stdout);
  assert.deepEqual(Object.keys(out), ['injectSteps'], 'injectSteps is the ONLY key (current AG PreInvocation output contract)');
  assert.equal(out.injectSteps.length, 1, 'exactly one injected step');
  assert.deepEqual(Object.keys(out.injectSteps[0]), ['ephemeralMessage'], 'ephemeralMessage (transient system message) is the step type');
  return out.injectSteps[0].ephemeralMessage;
}

test('AG conductor: first PreInvocation injects the directive ONCE (injectSteps/ephemeralMessage); repeats are silent (marker throttle)', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.git')); // anchor findGitRoot inside the sandbox
    const stdin = JSON.stringify({ session_id: 'AGC1', cwd: tmp, hook_event_name: 'PreInvocation' });
    const first = runHook(CONDUCTOR, stdin, tmp, ['PreInvocation']);
    assert.equal(first.status, 0);
    assert.equal(first.stderr, '', 'no stderr (Phoenix #13)');
    const msg = agInject(first.stdout);
    assert.ok(msg.includes('[CoalMine]'), 'AG emit is the sanctioned injectSteps/ephemeralMessage JSON');
    assert.ok(!msg.includes('self-update'), 'KIND 1 (CC plugin machinery) is skipped on AG');
    assert.ok(!fs.existsSync(path.join(tmp, '.claude', '.coalmine-update-check')), 'AG must not consume the CC update stamp');
    assert.ok(
      fs.readdirSync(path.join(tmp, 'coalmine')).some((f) => f.startsWith('ag-conductor-') && f.endsWith('.marker')),
      'once-per-session marker written to the private coalmine/ subdir (CodeQL js/insecure-temporary-file fix)',
    );

    const second = runHook(CONDUCTOR, stdin, tmp, ['PreInvocation']);
    assert.equal(second.status, 0);
    assert.equal(second.stdout, '', 'PreInvocation fires per model call — the marker must silence every repeat');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG conductor: a pre-existing marker (EEXIST on the wx create) causes a silent skip — exit 0, no output', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.git'));
    const markerDir = path.join(tmp, 'coalmine');
    fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
    const key = 'AGPLANTED';
    // Plant the exact marker the conductor would compute for this session key
    // BEFORE the hook ever runs — proves the wx create genuinely hits EEXIST
    // against the SAME path, not merely "some file already in the dir".
    fs.writeFileSync(path.join(markerDir, `ag-conductor-${djb2(key)}.marker`), '');
    const stdin = JSON.stringify({ session_id: key, cwd: tmp, hook_event_name: 'PreInvocation' });
    const r = runHook(CONDUCTOR, stdin, tmp, ['PreInvocation']);
    assert.equal(r.status, 0, 'EEXIST is caught and treated as fail-silent (Phoenix #4)');
    assert.equal(r.stdout, '', 'a pre-existing marker must skip the emit entirely');
    assert.equal(r.stderr, '', 'no stderr (Phoenix #13)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG conductor: unwritable tmp (TEMP/TMP/TMPDIR point at a FILE, ENOTDIR) fails closed — no emit, exit 0', () => {
  const tmp = mkTmp();
  const fakeTmpFile = path.join(tmp, 'not-a-dir'); // a FILE standing in for os.tmpdir()
  fs.writeFileSync(fakeTmpFile, '');
  try {
    const stdin = JSON.stringify({ session_id: 'AGUNWRITABLE', cwd: tmp, hook_event_name: 'PreInvocation' });
    // A merely-nonexistent TMPDIR would NOT reproduce this: mkdirSync({recursive:true})
    // just creates it. Pointing at an existing FILE makes the coalmine/ subdir
    // create fail with ENOTDIR — the real "can't write" case.
    const r = spawnSync(process.execPath, [CONDUCTOR, 'PreInvocation'], {
      input: stdin,
      encoding: 'utf8',
      cwd: tmp,
      env: { ...process.env, TEMP: fakeTmpFile, TMP: fakeTmpFile, TMPDIR: fakeTmpFile, USERPROFILE: tmp, HOME: tmp },
    });
    assert.equal(r.status, 0, 'fail-closed still exits 0 (Phoenix #4)');
    assert.equal(r.stdout, '', 'an unwritable tmp (ENOTDIR on mkdirSync) must skip the emit, never crash or leak an error');
    assert.equal(r.stderr, '', 'no stderr (Phoenix #13)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG conductor: a pre-planted SYMLINK at the marker subdir is refused — no marker in the target, no emit (dir-symlink close)', (t) => {
  const tmp = mkTmp();
  const target = mkTmp(); // attacker-controlled dir the planted symlink points at
  try {
    fs.mkdirSync(path.join(tmp, '.git'));
    // mkdirSync(recursive) FOLLOWS a pre-planted symlink at os.tmpdir()/coalmine (silently
    // succeeding, 0o700 unapplied); without the lstat guard the wx marker writes THROUGH into
    // `target`. The guard must lstat (no-follow) + fail-closed (skip the emit), the advisory class.
    const markerDir = path.join(tmp, 'coalmine');
    try {
      fs.symlinkSync(target, markerDir, process.platform === 'win32' ? 'junction' : 'dir');
    } catch {
      t.skip('symlink/junction unavailable (needs privilege) — cannot exercise the dir-symlink guard');
      return; // t.skip does not stop the body; return so the case is skipped, never a vacuous pass
    }
    const stdin = JSON.stringify({ session_id: 'AGSYM', cwd: tmp, hook_event_name: 'PreInvocation' });
    const r = runHook(CONDUCTOR, stdin, tmp, ['PreInvocation']);
    assert.equal(r.status, 0, 'fail-closed still exits 0 (Phoenix #4)');
    assert.equal(r.stdout, '', 'a symlinked marker subdir must skip the emit entirely (fail-closed)');
    assert.equal(r.stderr, '', 'no stderr (Phoenix #13)');
    assert.equal(fs.readdirSync(target).length, 0, 'no marker written THROUGH the symlink into the attacker dir');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('AG conductor: transcript_path keys the session when session_id is absent; no key / garbage → silent', () => {
  const tmp = mkTmp();
  try {
    const byTranscript = runHook(CONDUCTOR, JSON.stringify({ transcript_path: 'C:/x/t.jsonl' }), tmp, ['PreInvocation']);
    assert.equal(byTranscript.status, 0);
    assert.ok(agInject(byTranscript.stdout).includes('[CoalMine]'), 'transcript_path works as the fallback key');

    for (const stdin of [JSON.stringify({}), 'not json {{{', '']) {
      const r = runHook(CONDUCTOR, stdin, tmp, ['PreInvocation']);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, '', 'un-keyable payload → no emit (an unguarded injection would repeat per model call)');
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG conductor: KIND 2 past-due rule nudge rides the guarded injection; enableConductor:false silences AG too', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.git'));
    const rulesDir = path.join(tmp, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fs.writeFileSync(path.join(rulesDir, 'a.md'), `<!-- coalmine: verified ${old} · exemplar X · revalidate 30d -->\n`, 'utf8');
    const r = runHook(CONDUCTOR, JSON.stringify({ sessionId: 'AGC2', cwd: tmp }), tmp, ['PreInvocation']);
    assert.equal(r.status, 0);
    assert.ok(agInject(r.stdout).includes('past their revalidate date'), 'KIND 2 detected via the camelCase sessionId variant');

    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ enableConductor: false }), 'utf8');
    // Count-based, not filename-based: the marker filename embeds djb2(sessionId)
    // (a hash), never the literal session id, so a `.includes('AGC3')` check on
    // the filename can never match anything — count is the correct observable.
    const beforeCount = fs.readdirSync(path.join(tmp, 'coalmine')).length;
    const off = runHook(CONDUCTOR, JSON.stringify({ session_id: 'AGC3', cwd: tmp }), tmp, ['PreInvocation']);
    assert.equal(off.status, 0);
    assert.equal(off.stdout, '', 'the config gate silences the AG path too');
    assert.equal(
      fs.readdirSync(path.join(tmp, 'coalmine')).length,
      beforeCount,
      'a silenced conductor writes no NEW marker',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG conductor: onboarding suppression follows the PAYLOAD cwd, not the hook process cwd (redundant-offer fix)', () => {
  const spawnDir = mkTmp(); // the hook PROCESS's own cwd -- NOT the workspace on AG, holds no stamp
  const workDir = mkTmp();  // the payload's cwd -- the real workspace, holds the verified stamp
  try {
    fs.mkdirSync(path.join(workDir, '.git')); // anchor findGitRoot(workDir) at workDir, not further up
    const rulesDir = path.join(workDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'gold-standard.md'), '<!-- coalmine: verified 2026-07-01 revalidate 90d -->\n', 'utf8');
    const stdin = JSON.stringify({ session_id: 'AGCWD1', cwd: workDir, hook_event_name: 'PreInvocation' });
    const r = runHook(CONDUCTOR, stdin, spawnDir, ['PreInvocation']);
    assert.equal(r.status, 0);
    assert.ok(
      !agInject(r.stdout).includes('offer /gold-standard ONCE'),
      'a verified stamp at the PAYLOAD cwd must suppress onboarding even though the hook process cwd (spawnDir) has none -- proves the check follows input.cwd, not process.cwd()',
    );
  } finally {
    fs.rmSync(spawnDir, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

// CURRENT AG spec payload (re-derived 2026-07-23): conversationId + workspacePaths[]
// — no cwd, no session_id. The conductor must key the marker on conversationId and
// resolve the workspace from workspacePaths[0].
test('AG conductor current-spec payload (conversationId + workspacePaths): injects once at the workspace, repeat silent', () => {
  const spawnDir = mkTmp(); // hook process cwd = the hooks.json dir on AG, NOT the workspace
  const workDir = mkTmp();
  try {
    fs.mkdirSync(path.join(workDir, '.git'));
    const rulesDir = path.join(workDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'gold-standard.md'), '<!-- coalmine: verified 2026-07-01 revalidate 90d -->\n', 'utf8');
    const stdin = JSON.stringify({ conversationId: 'AGCONV1', workspacePaths: [workDir] });
    const first = runHook(CONDUCTOR, stdin, spawnDir, ['PreInvocation']);
    assert.equal(first.status, 0);
    const msg = agInject(first.stdout);
    assert.ok(msg.includes('[CoalMine]'), 'a current-spec payload (no cwd/session_id) still injects');
    assert.ok(
      !msg.includes('offer /gold-standard ONCE'),
      'workspacePaths[0] drives the onboarding check (the current spec ships no cwd field)',
    );
    const second = runHook(CONDUCTOR, stdin, spawnDir, ['PreInvocation']);
    assert.equal(second.status, 0);
    assert.equal(second.stdout, '', 'conversationId keys the once-per-session marker');
  } finally {
    fs.rmSync(spawnDir, { recursive: true, force: true });
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test("Gemini conductor: SessionStart argv emits the NESTED hookSpecificOutput.additionalContext shape (not AG's flat shape)", () => {
  const tmp = mkTmp();
  try {
    const first = runHook(CONDUCTOR, '', tmp, ['SessionStart']);
    assert.equal(first.status, 0);
    assert.equal(first.stderr, '', 'no stderr (Phoenix #13)');
    const out = JSON.parse(first.stdout);
    assert.ok(out.hookSpecificOutput && out.hookSpecificOutput.additionalContext.includes('[CoalMine]'), 'Gemini emit is the nested hookSpecificOutput.additionalContext shape');
    assert.ok(!('additionalContext' in out), 'never AG\'s flat top-level shape on Gemini');
    assert.ok(!out.hookSpecificOutput.additionalContext.includes('self-update'), 'KIND 1 (CC plugin machinery) is skipped on Gemini, same as AG');
    assert.ok(!fs.existsSync(path.join(tmp, '.claude', '.coalmine-update-check')), 'Gemini must not consume the CC update stamp');
    let noMarkerFiles = [];
    try { noMarkerFiles = fs.readdirSync(path.join(tmp, 'coalmine')); } catch {} // subdir never created is also a pass
    assert.ok(
      !noMarkerFiles.some((f) => f.endsWith('.marker')),
      'Gemini needs no once-per-session marker file — SessionStart already fires once per session',
    );

    const second = runHook(CONDUCTOR, '', tmp, ['SessionStart']);
    assert.equal(second.status, 0);
    assert.ok(
      JSON.parse(second.stdout).hookSpecificOutput.additionalContext.includes('[CoalMine]'),
      'no marker throttle on Gemini — fires every invocation, unlike AG\'s once-per-session guard',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Gemini conductor: KIND 2 past-due rule nudge rides the nested output; enableConductor:false silences it too', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, '.git')); // anchor findGitRoot inside the sandbox (Gemini reads process.cwd(), which runHook sets to tmp)
    const rulesDir = path.join(tmp, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fs.writeFileSync(path.join(rulesDir, 'a.md'), `<!-- coalmine: verified ${old} · exemplar X · revalidate 30d -->\n`, 'utf8');
    const r = runHook(CONDUCTOR, '', tmp, ['SessionStart']);
    assert.equal(r.status, 0);
    assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.includes('past their revalidate date'), 'KIND 2 detected via process.cwd()');

    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ enableConductor: false }), 'utf8');
    const off = runHook(CONDUCTOR, '', tmp, ['SessionStart']);
    assert.equal(off.status, 0);
    assert.equal(off.stdout, '', 'the config gate silences the Gemini path too');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('file-copy mode (FileCopy argv): plain CC text shape, KIND 1 self-update skipped, update stamp NOT written', () => {
  const tmp = mkTmp();
  try {
    // No config → updateMode defaults to 'ask'. On the plain CC (no-argv) path
    // that emits the KIND 1 ask directive AND writes ~/.claude/.coalmine-update-check.
    // The 5 file-copy platforms (Copilot CLI/Kiro/Augment/Devin CLI/Junie) install
    // by file-copy: a `claude plugin update` offer is a wrong instruction there,
    // and the stamp write would throttle a co-installed real CC's own nudge.
    const r = runHook(CONDUCTOR, '', tmp, ['FileCopy']);
    assert.equal(r.status, 0);
    assert.equal(r.stderr, '', 'no stderr (Phoenix #13)');
    assert.ok(r.stdout.includes('[CoalMine]'), 'file-copy mode emits the plain CC text shape');
    assert.ok(!r.stdout.trim().startsWith('{'), 'plain stdout — never the AG/Gemini JSON envelope (FileCopy must not fall into the AG branch)');
    assert.ok(!r.stdout.includes('self-update'), 'KIND 1 (CC plugin machinery) is skipped on file-copy platforms');
    assert.ok(!fs.existsSync(path.join(tmp, '.claude', '.coalmine-update-check')), 'file-copy mode must not consume the shared CC update stamp');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AG touch: toolCall.args payload (camelCase) records the edited file', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp) — must live OUTSIDE tmp now
  try {
    const real = path.join(proj, 'edited-b.js');
    fs.writeFileSync(real, 'x');
    const stdin = JSON.stringify({ session_id: 'AGT1', cwd: proj, toolCall: { name: 'write_to_file', args: { filePath: real } } });
    const r = runHook(TOUCH, stdin, tmp, ['PostToolUse']);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', 'touch stays silent');
    const touched = path.join(tmp, 'rot-canary-AGT1.touched');
    assert.ok(fs.existsSync(touched), '.touched recorded from the AG toolCall.args shape');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('edited-b.js'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('AG stop: emits the explicit no-op {} (no Stop inject channel in the current engine; never decision:block)', () => {
  const tmp = mkTmp();
  try {
    const real = path.join(tmp, 'edited-c.js');
    fs.writeFileSync(real, 'x');
    fs.writeFileSync(path.join(tmp, 'rot-canary-AGS1.touched'), real + '\n');
    const r = runHook(STOP, JSON.stringify({ session_id: 'AGS1' }), tmp, ['Stop']);
    assert.equal(r.status, 0);
    // Contract re-derived 2026-07-23: the engine documents NO Stop-output inject
    // channel; the pilot-era additionalContext key is a dead letter. The valid
    // output is the explicit no-op {} — never the dead key, never decision:block.
    assert.equal(r.stdout.trim(), '{}', 'AG Stop output is the explicit empty object');
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-AGS1.scanned')), 'the scan side effects (ack marker) still ran');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// The touch->stop pair shares one tmp-state key chain: on the current AG spec both
// hooks must derive it from conversationId (a split chain would strand the state).
test('AG touch+stop pair on the current-spec payload: conversationId keys the shared state, workspacePaths[0] resolves relative paths', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project workspace, sibling of the sandbox os.tmpdir() (tmp) — must live OUTSIDE tmp now
  try {
    fs.writeFileSync(path.join(proj, 'edited-conv.js'), 'x');
    const t1 = runHook(TOUCH, JSON.stringify({
      conversationId: 'AGCONV2',
      workspacePaths: [proj],
      tool_name: 'write_to_file',
      tool_input: { file_path: 'edited-conv.js' }, // relative — must resolve vs workspacePaths[0]
    }), tmp, ['PostToolUse']);
    assert.equal(t1.status, 0);
    assert.equal(t1.stdout, '', 'touch stays silent');
    const touched = path.join(tmp, 'rot-canary-AGCONV2.touched');
    assert.ok(fs.existsSync(touched), '.touched keyed by conversationId');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('edited-conv.js'), 'relative path resolved against workspacePaths[0]');

    const r = runHook(STOP, JSON.stringify({ conversationId: 'AGCONV2' }), tmp, ['Stop']);
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '{}', 'AG Stop no-op output');
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-AGCONV2.scanned')), 'stop read the conversationId-keyed state (one chain across the pair)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('stop sweep collects stale AG conductor markers (Phoenix #1)', () => {
  const tmp = mkTmp();
  try {
    const stale = path.join(tmp, 'coalmine-conductor-zzz.marker');
    fs.writeFileSync(stale, '');
    const old = Date.now() - 99 * 24 * 60 * 60 * 1000;
    fs.utimesSync(stale, new Date(old), new Date(old));
    const r = runHook(STOP, JSON.stringify({ session_id: 'SWP', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(!fs.existsSync(stale), 'a legacy flat-tmp-root marker (pre-fix install) is still swept with the rot-canary temp');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop sweep collects stale AG conductor markers from the new coalmine/ subdir (CodeQL fix)', () => {
  const tmp = mkTmp();
  try {
    const markerDir = path.join(tmp, 'coalmine');
    fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
    const stale = path.join(markerDir, 'ag-conductor-zzz.marker');
    fs.writeFileSync(stale, '');
    const old = Date.now() - 99 * 24 * 60 * 60 * 1000;
    fs.utimesSync(stale, new Date(old), new Date(old));
    const r = runHook(STOP, JSON.stringify({ session_id: 'SWP2', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(!fs.existsSync(stale), 'a stale AG conductor marker in the private coalmine/ subdir is swept too');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop sweep collects conductor markers even when rot-canary is OFF — but still leaves the canary\'s own temp alone (ownership split)', () => {
  // The conductor markers belong to the CONDUCTOR (independently enabled, no stop
  // hook of its own); gating their only collector on rot-canary's mode leaked one
  // marker per AG session forever for an off/manual-canary + conductor-on user.
  // The canary's OWN temp stays untouched when disabled (pinned Node≡PS behavior).
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ disabledCanaries: ['rot-canary'] }), 'utf8');
    const old = Date.now() - 99 * 24 * 60 * 60 * 1000;
    // Stale conductor marker in the new coalmine/ subdir...
    const markerDir = path.join(tmp, 'coalmine');
    fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
    const subdirMarker = path.join(markerDir, 'ag-conductor-yyy.marker');
    fs.writeFileSync(subdirMarker, '');
    fs.utimesSync(subdirMarker, new Date(old), new Date(old));
    // ...a stale legacy flat-root marker (pre-fix install)...
    const flatMarker = path.join(tmp, 'coalmine-conductor-yyy.marker');
    fs.writeFileSync(flatMarker, '');
    fs.utimesSync(flatMarker, new Date(old), new Date(old));
    // ...and the canary's OWN stale temp, which a disabled canary must NOT touch.
    const canaryTemp = path.join(tmp, 'rot-canary-OLD2.touched');
    fs.writeFileSync(canaryTemp, 'C:\\proj\\z.js\n');
    fs.utimesSync(canaryTemp, new Date(old), new Date(old));

    const r = runHook(STOP, JSON.stringify({ session_id: 'OFFSWP', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', 'disabled canary emits nothing');
    assert.ok(!fs.existsSync(subdirMarker), 'stale coalmine/ marker collected even with rot-canary off');
    assert.ok(!fs.existsSync(flatMarker), 'stale legacy flat marker collected even with rot-canary off');
    assert.ok(fs.existsSync(canaryTemp), "the canary's own temp stays untouched when disabled (pinned behavior preserved)");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- Memory-drift exit-gate (2026-07-24 first cut) ----
// A helper that plants a REAL code file + its .touched record so the stop hook's
// existsSync filter passes, with the sandbox tmp as both TEMP and project root.
function plantCodeSession(tmp, sid) {
  const proj = path.join(tmp, 'proj');
  fs.mkdirSync(proj, { recursive: true });
  const code = path.join(proj, 'a.js');
  fs.writeFileSync(code, 'x();\n');
  fs.writeFileSync(path.join(tmp, `rot-canary-${sid}.touched`), code + '\n');
  return code;
}

test('touch hook records a MEMORY.md edit as .memmoved marker, never into .touched', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // project dir, sibling of the sandbox os.tmpdir() (tmp) — a MEMORY.md UNDER tmp is covered separately (tmpdir-exclusion test below)
  try {
    const mem = path.join(proj, 'MEMORY.md');
    fs.writeFileSync(mem, '# m\n');
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'MD1', tool_input: { file_path: mem } }), tmp);
    assert.equal(r.status, 0);
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-MD1.memmoved')), '.memmoved marker created');
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-MD1.touched')), 'MEMORY.md never enters the code .touched list');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('stop hook appends the memory-drift advisory when code moved, project has MEMORY.md, and no .memmoved', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, 'MEMORY.md'), '# project memory\n'); // project root uses the convention
    plantCodeSession(tmp, 'MD2');
    const r = runHook(STOP, JSON.stringify({ session_id: 'MD2', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('memoryDriftNudge'), 'drift advisory line appended (key name appears in every language)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook stays drift-silent when a MEMORY.md edit was recorded (.memmoved present)', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, 'MEMORY.md'), '# project memory\n');
    plantCodeSession(tmp, 'MD3');
    fs.writeFileSync(path.join(tmp, 'rot-canary-MD3.memmoved'), '');
    const r = runHook(STOP, JSON.stringify({ session_id: 'MD3', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('rot-canary'), 'the scan nudge itself still fires');
    assert.ok(!r.stdout.includes('memoryDriftNudge'), 'no drift line when memory moved this session');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook stays drift-silent when the project has no MEMORY.md convention', () => {
  const tmp = mkTmp();
  try {
    plantCodeSession(tmp, 'MD4'); // no MEMORY.md at the sandbox project root
    const r = runHook(STOP, JSON.stringify({ session_id: 'MD4', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('rot-canary'), 'the scan nudge itself still fires');
    assert.ok(!r.stdout.includes('memoryDriftNudge'), 'no drift line on a project without MEMORY.md');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('memoryDriftNudge:false silences the drift line but not the scan nudge', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, 'MEMORY.md'), '# project memory\n');
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ memoryDriftNudge: false }), 'utf8');
    plantCodeSession(tmp, 'MD5');
    const r = runHook(STOP, JSON.stringify({ session_id: 'MD5', stop_hook_active: false }), tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('rot-canary'), 'the scan nudge itself still fires');
    assert.ok(!r.stdout.includes('memoryDriftNudge'), 'config off-switch silences the drift line');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- os.tmpdir() scratch-space exclusion (2026-07-25, dogfood-found) ----
// A long IC campaign writes one-shot harness .mjs files under the SESSION SCRATCHPAD,
// which lives INSIDE os.tmpdir() — every Stop-scan nagged on them. The touch hook must
// exclude anything under its own os.tmpdir() before recording, without excluding a real
// project file that merely happens to live in the test sandbox's chosen TEMP dir.

test('touch hook excludes a file living under the sandbox os.tmpdir() (scratchpad exclusion) — no .touched, no .memmoved', () => {
  const tmp = mkTmp();
  try {
    // A watched-extension file directly under the hook's own os.tmpdir() (TEMP/TMP/TMPDIR
    // all point at tmp) — the dogfood shape: a one-shot IC-campaign harness .mjs under
    // the session scratchpad, which lives INSIDE os.tmpdir().
    const scratch = path.join(tmp, 'harness.mjs');
    fs.writeFileSync(scratch, 'x();\n');
    const r1 = runHook(TOUCH, JSON.stringify({ session_id: 'TMPX1', tool_input: { file_path: scratch } }), tmp);
    assert.equal(r1.status, 0);
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-TMPX1.touched')), 'a tmpdir-resident code file must not be recorded');

    // A MEMORY.md living under the same os.tmpdir() must not set .memmoved either —
    // temp files count for nothing, including the drift-marker convention file.
    const memInTmp = path.join(tmp, 'MEMORY.md');
    fs.writeFileSync(memInTmp, '# scratch\n');
    const r2 = runHook(TOUCH, JSON.stringify({ session_id: 'TMPX2', tool_input: { file_path: memInTmp } }), tmp);
    assert.equal(r2.status, 0);
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-TMPX2.memmoved')), 'a tmpdir-resident MEMORY.md must not set .memmoved');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook still records a normal project file living OUTSIDE os.tmpdir() (no-regression)', () => {
  const tmp = mkTmp();
  const proj = mkTmp(); // a project dir, sibling of the sandbox os.tmpdir() (tmp) — NOT nested inside it
  try {
    const real = path.join(proj, 'edited-real.mjs');
    fs.writeFileSync(real, 'x();\n');
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'TMPX3', tool_input: { file_path: real } }), tmp);
    assert.equal(r.status, 0);
    const touched = path.join(tmp, 'rot-canary-TMPX3.touched');
    assert.ok(fs.existsSync(touched), 'a project file outside os.tmpdir() is still recorded');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('edited-real.mjs'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(proj, { recursive: true, force: true });
  }
});

test('touch hook does NOT exclude a sibling directory whose name merely PREFIXES the tmpdir path (e.g. "<tmp>X")', () => {
  const tmp = mkTmp();
  const sibling = tmp + 'X'; // same parent, NOT nested — "<tmp>X" textually starts with "<tmp>" but is a different dir
  fs.mkdirSync(sibling, { recursive: true });
  try {
    const real = path.join(sibling, 'a.js');
    fs.writeFileSync(real, 'x();\n');
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'TMPX4', tool_input: { file_path: real } }), tmp);
    assert.equal(r.status, 0);
    const touched = path.join(tmp, 'rot-canary-TMPX4.touched');
    assert.ok(fs.existsSync(touched), 'a sibling dir sharing a string prefix with tmpdir must NOT be excluded');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('a.js'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(sibling, { recursive: true, force: true });
  }
});
