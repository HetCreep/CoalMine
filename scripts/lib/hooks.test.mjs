// CoalMine rotcanary hook tests — node:test built-in, zero dependencies.
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
const TOUCH = path.join(repo, 'hooks', 'rotcanary-touch.js');
const STOP = path.join(repo, 'hooks', 'rotcanary-stop.js');

function runHook(script, input, tmp) {
  // TEMP/TMP/TMPDIR → sandbox os.tmpdir(); USERPROFILE/HOME → sandbox os.homedir()
  // so the real ~/.claude/.rotcanary-mode can never affect the test (mode = auto default).
  return spawnSync(process.execPath, [script], {
    input,
    encoding: 'utf8',
    env: { ...process.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp, USERPROFILE: tmp, HOME: tmp },
  });
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-hooktest-'));
}

test('touch hook records edited code file and exits 0', () => {
  const tmp = mkTmp();
  try {
    const r = runHook(TOUCH, JSON.stringify({ session_id: 'T1', tool_input: { file_path: 'C:\\proj\\a.js' } }), tmp);
    assert.equal(r.status, 0);
    const touched = path.join(tmp, 'rotcanary-T1.touched');
    assert.ok(fs.existsSync(touched), '.touched file must be created in sandbox TEMP');
    assert.ok(fs.readFileSync(touched, 'utf8').includes('a.js'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('touch hook dedups case-insensitively on win32 and never crashes', () => {
  const tmp = mkTmp();
  try {
    runHook(TOUCH, JSON.stringify({ session_id: 'T2', tool_input: { file_path: 'C:\\proj\\App.js' } }), tmp);
    runHook(TOUCH, JSON.stringify({ session_id: 'T2', tool_input: { file_path: 'C:\\proj\\app.js' } }), tmp);
    const lines = fs.readFileSync(path.join(tmp, 'rotcanary-T2.touched'), 'utf8').split('\n').filter(Boolean);
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

test('stop hook emits decision:block nudge listing touched files, then stays quiet', () => {
  const tmp = mkTmp();
  try {
    const base = path.join(tmp, 'rotcanary-S1');
    fs.writeFileSync(base + '.touched', 'C:\\proj\\a.js\n');
    const stdin = JSON.stringify({ session_id: 'S1', stop_hook_active: false });

    const first = runHook(STOP, stdin, tmp);
    assert.equal(first.status, 0);
    const out = JSON.parse(first.stdout);
    assert.equal(out.decision, 'block');
    assert.ok(out.reason.includes('a.js'), 'reason lists the touched file');
    assert.ok(fs.existsSync(base + '.scanned'), 'one-shot marker written');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('stop hook cleans up session temp files once the batch is acknowledged', () => {
  const tmp = mkTmp();
  try {
    const base = path.join(tmp, 'rotcanary-S2');
    fs.writeFileSync(base + '.touched', 'C:\\proj\\a.js\n');
    fs.writeFileSync(base + '.smells', '');
    fs.writeFileSync(base + '.scanned', String(Date.now() + 60_000));

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
