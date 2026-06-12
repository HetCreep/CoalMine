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


function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const gitPath = path.join(dir, '.git');
    if (fs.existsSync(gitPath)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return startDir;
}

// Per-project calibration: .coalmine.json at root may disable this canary or
// override the mode for the project (principle 9 - calibrate, never assume).
function projectOverride() {
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cfg = JSON.parse(content);
    if (cfg && Array.isArray(cfg.disable) && (cfg.disable.includes('rot-canary') || cfg.disable.includes('all'))) return 'off';
    if (cfg && (cfg.mode === 'off' || cfg.mode === 'manual')) return cfg.mode;
  } catch {}
  return null;
}
function getTripwireMaxFileSizeKb() {
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cfg = JSON.parse(content);
    if (cfg && typeof cfg.tripwireMaxFileSizeKb === 'number') {
      return cfg.tripwireMaxFileSizeKb;
    }
  } catch {}
  return 100;
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
  // Convert to absolute normalized path to prevent subdirectory bugs
  const normF = path.resolve(process.cwd(), f);
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
  // (Phoenix #3: ≤100ms with scan). Capped at 100KB to prevent CPU lock and token bloat.
  try { if (fs.statSync(normF).size > getTripwireMaxFileSizeKb() * 1024) return; } catch { return; }
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

