#!/usr/bin/env node
// Code-Health Tier 2 (Stop) — cross-platform (Node).
// At a natural stop, if code was edited this session, ask the agent to run the rotcanary
// skill at DEPTH=QUICK on the touched files. Loop-guarded (stop_hook_active), one-shot per
// edit-batch, kill-switchable via ~/.claude/.rotcanary-off.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mode: ~/.claude/.rotcanary-mode = auto|manual|off (absent = auto). .rotcanary-off = off (back-compat).
// Only AUTO emits the session-end nudge (manual/off do not).
function rcMode() {
  try {
    const dir = path.join(os.homedir(), '.claude');
    if (fs.existsSync(path.join(dir, '.rotcanary-off'))) return 'off';
    const f = path.join(dir, '.rotcanary-mode');
    if (fs.existsSync(f)) {
      const v = fs.readFileSync(f, 'utf8').trim().toLowerCase();
      if (v === 'off' || v === 'manual' || v === 'auto') return v;
    }
  } catch {}
  return 'auto';
}

function main() {
  if (rcMode() !== 'auto') return;

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }
  if (input.stop_hook_active) return;

  const sid = input.session_id;
  if (!sid) return;

  const base = path.join(os.tmpdir(), `rotcanary-${sid}`);
  const touched = base + '.touched';
  if (!fs.existsSync(touched)) return;

  const scanned = base + '.scanned';
  try {
    if (fs.existsSync(scanned) && fs.statSync(touched).mtimeMs <= fs.statSync(scanned).mtimeMs) return;
  } catch {}

  let files = [];
  try { files = [...new Set(fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean))].sort(); } catch { return; }
  if (!files.length) return;

  let smellText = '';
  try {
    if (fs.existsSync(base + '.smells')) {
      const sm = [...new Set(fs.readFileSync(base + '.smells', 'utf8').split('\n').filter(Boolean))].sort();
      if (sm.length) smellText = '\nTripwires flagged at edit time:\n' + sm.join('\n');
    }
  } catch {}

  try { fs.writeFileSync(scanned, String(Date.now())); } catch {}

  const list = files.map((x) => '  - ' + x).join('\n');
  const reason =
    'Code-health auto-check (session end): code files were edited this session. Before stopping, ' +
    'invoke the rotcanary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:\n' +
    list + smellText +
    '\n\nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing ' +
    'material, say so in one line. Do not fix unless asked. (To disable this auto-check: create ~/.claude/.rotcanary-off)';

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

try { main(); } catch {}
process.exit(0);
