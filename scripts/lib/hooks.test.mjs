// CoalMine rot-canary hook tests — node:test built-in, zero dependencies.
// Run: node --test scripts/lib/hooks.test.mjs
// Spawns the real hooks with fixture stdin and a sandboxed TEMP so no real
// session state is touched. Covers: touch record + case-insensitive dedup,
// fail-silent on garbage, stop nudge emit, acknowledged-batch cleanup.

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

function runHook(script, input, tmp) {
  // TEMP/TMP/TMPDIR → sandbox os.tmpdir(); USERPROFILE/HOME → sandbox os.homedir()
  // so the real ~/.claude/.rot-canary-mode can never affect the test (mode = auto default).
  return spawnSync(process.execPath, [script], {
    input,
    encoding: 'utf8',
    cwd: tmp,
    env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp, USERPROFILE: tmp, HOME: tmp },
  });
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-hooktest-'));
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
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ tripwireMaxFileSizeKb: 1 }), 'utf8');
    
    // Create a file larger than 1KB (e.g. 2KB)
    const largeFile = path.join(tmp, 'large.js');
    fs.writeFileSync(largeFile, 'x'.repeat(2048));
    
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T3', tool_input: { file_path: largeFile } }), tmp);
    assert.equal(r.status, 0);
    
    // It should record the touched file path, but should NOT flag it as smell (smell scan is skipped)
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-T3.touched')), 'touched path is still recorded');
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-T3.smells')), 'large file smells check was skipped due to size cap');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook honors watchedExtensions override in .coalmine.json', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ watchedExtensions: ['py', '.sh'] }), 'utf8');
    
    const fileJs = path.join(tmp, 'file.js');
    fs.writeFileSync(fileJs, 'x');
    const filePy = path.join(tmp, 'file.py');
    fs.writeFileSync(filePy, 'x');
    
    const r1 = runHook(TOUCH, JSON.stringify({ session_id: 'T4', tool_input: { file_path: fileJs } }), tmp);
    assert.equal(r1.status, 0);
    assert.ok(!fs.existsSync(path.join(tmp, 'rot-canary-T4.touched')), 'unwatched JS file is ignored');
    
    const r2 = runHook(TOUCH, JSON.stringify({ session_id: 'T4', tool_input: { file_path: filePy } }), tmp);
    assert.equal(r2.status, 0);
    assert.ok(fs.existsSync(path.join(tmp, 'rot-canary-T4.touched')), 'watched PY file is recorded');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook honors tripwireMaxLines override in .coalmine.json', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ tripwireMaxLines: 5 }), 'utf8');
    
    const fileLines = path.join(tmp, 'lines.js');
    fs.writeFileSync(fileLines, 'x\n'.repeat(10)); // 11 lines
    
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T5', tool_input: { file_path: fileLines } }), tmp);
    assert.equal(r.status, 0);
    
    const smellsFile = path.join(tmp, 'rot-canary-T5.smells');
    assert.ok(fs.existsSync(smellsFile), 'smell file was created');
    assert.ok(fs.readFileSync(smellsFile, 'utf8').includes('file >5 lines'), 'triggered custom maxLines smell warning');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook clamps a negative tripwireMaxLines → no mass false-smell (Board-2 clamp)', () => {
  const tmp = mkTmp();
  try {
    // raw -3 would flag EVERY file (lines > -3 is always true); clamped to >=1 a
    // 1-line file must NOT be flagged. Same clamp class as tripwireMaxFileSizeKb / ruleRevalidateDays.
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), JSON.stringify({ tripwireMaxLines: -3 }), 'utf8');
    const oneLine = path.join(tmp, 'one.js');
    fs.writeFileSync(oneLine, 'x'); // 1 line, no trailing newline
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T5b', tool_input: { file_path: oneLine } }), tmp);
    assert.equal(r.status, 0);
    const smellsFile = path.join(tmp, 'rot-canary-T5b.smells');
    const smells = fs.existsSync(smellsFile) ? fs.readFileSync(smellsFile, 'utf8') : '';
    assert.ok(!smells.includes('lines'), 'a negative tripwireMaxLines must not produce a line-count smell on a 1-line file');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('loadCfg parses JSONC with a backslash-terminated string before a later // string (no silent revert to defaults)', () => {
  const tmp = mkTmp();
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
    fs.writeFileSync(path.join(tmp, '.coalmine.json'), jsonc, 'utf8');

    const fileLines = path.join(tmp, 'lines.js');
    fs.writeFileSync(fileLines, 'x\n'.repeat(10)); // 11 lines > the override of 5

    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T6', tool_input: { file_path: fileLines } }), tmp);
    assert.equal(r.status, 0);

    const smellsFile = path.join(tmp, 'rot-canary-T6.smells');
    assert.ok(fs.existsSync(smellsFile), 'config parsed: smell file created from the JSONC override');
    assert.ok(
      fs.readFileSync(smellsFile, 'utf8').includes('file >5 lines'),
      'tripwireMaxLines:5 honored — config did NOT silently revert to the default 800',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
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
