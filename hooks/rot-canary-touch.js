#!/usr/bin/env node
// Code-Health Tier 1 (PostToolUse: Write|Edit|MultiEdit) — cross-platform (Node).
// Records touched code files for the session + flags unambiguous tripwires. Always non-blocking (exit 0).
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mode: ~/.claude/.rot-canary-mode = auto|manual|off (absent = auto). .rot-canary-off = off (back-compat).
// off → record nothing. auto & manual → record touched files (the tripwire).
function rcMode() {
  try {
    const dir = path.join(os.homedir(), '.claude');
    if (fs.existsSync(path.join(dir, '.rot-canary-off')) || fs.existsSync(path.join(dir, '.rotcanary-off'))) return 'off'; // legacy name honored
    let f = path.join(dir, '.rot-canary-mode');
    if (!fs.existsSync(f)) f = path.join(dir, '.rotcanary-mode'); // legacy name honored
    if (fs.existsSync(f)) {
      const v = fs.readFileSync(f, 'utf8').trim().toLowerCase();
      if (v === 'off' || v === 'manual' || v === 'auto') return v;
    }
  } catch {}
  return 'auto';
}

const CODE_EXT = new Set([
  '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go',
  '.java', '.kt', '.kts', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.rb',
  '.php', '.swift', '.dart', '.fs', '.vb', '.scala', '.m', '.mm',
]);


// Per-project calibration: .coalmine.json at cwd may disable this canary or
// override the mode for the project (principle 9 - calibrate, never assume).
function projectOverride() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.coalmine.json'), 'utf8'));
    if (cfg && Array.isArray(cfg.disable) && cfg.disable.includes('rot-canary')) return 'off';
    if (cfg && (cfg.mode === 'off' || cfg.mode === 'manual')) return cfg.mode;
  } catch {}
  return null;
}
function main() {
  const ov = projectOverride();
  if (ov === 'off') return;
  if (rcMode() === 'off') return;
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }

  const f = input && input.tool_input && input.tool_input.file_path;
  if (!f) return;
  const normF = path.normalize(f);
  if (!CODE_EXT.has(path.extname(normF).toLowerCase())) return;

  // No session id → no consumer (the stop hook bails without one). Record nothing.
  const sid = input.session_id;
  if (!sid) return;
  const base = path.join(os.tmpdir(), `rot-canary-${sid}`);
  const touched = base + '.touched';

  let existing = [];
  try { existing = fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean).map((x) => path.normalize(x)); } catch {}
  const isWin = process.platform === 'win32';
  const fCompare = isWin ? normF.toLowerCase() : normF;
  const existingCompare = isWin ? existing.map((x) => x.toLowerCase()) : existing;
  if (!existingCompare.includes(fCompare)) { try { fs.appendFileSync(touched, normF + '\n'); } catch {} }

  // Tripwire scan — skip very large files to stay inside the latency budget
  // (Phoenix #3: ≤100ms with scan).
  try { if (fs.statSync(normF).size > 1024 * 1024) return; } catch { return; }
  let lines;
  try { lines = fs.readFileSync(normF, 'utf8').split(/\r?\n/); } catch { return; }

  const smells = [];
  if (lines.some((l) => /^(<<<<<<< |>>>>>>> |=======$)/.test(l))) smells.push('merge-conflict markers');
  if (lines.length > 800) smells.push(`file >800 lines (${lines.length})`);
  if (smells.length) {
    // One line per file — the stop hook reports each .smells line verbatim.
    try { fs.appendFileSync(base + '.smells', `${normF}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
