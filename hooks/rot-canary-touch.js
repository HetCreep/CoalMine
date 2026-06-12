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

// Single cached read of .coalmine.json, resolved from the project root, BOM- and
// comment-tolerant. Every override below shares it — one disk read per invocation
// (Phoenix #3: budget the work, not the process).
let _cfg;
function loadCfg() {
  if (_cfg !== undefined) return _cfg;
  _cfg = null;
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    _cfg = JSON.parse(cleanJson);
  } catch {}
  return _cfg;
}

// Per-project calibration: .coalmine.json at root may disable this canary or
// override the mode for the project (principle 9 - calibrate, never assume).
function projectOverride() {
  try {
    const cfg = loadCfg();
    if (!cfg) return null;
    const disabled = cfg.disabledCanaries !== undefined ? cfg.disabledCanaries : cfg.disable; // legacy key honored
    if (Array.isArray(disabled) && (disabled.includes('rot-canary') || disabled.includes('all'))) return 'off';
    const mode = cfg.rotCanaryMode !== undefined ? cfg.rotCanaryMode : cfg.mode; // legacy key honored
    if (mode === 'off' || mode === 'manual') return mode;
  } catch {}
  return null;
}
function getTripwireMaxFileSizeKb() {
  try {
    const cfg = loadCfg();
    if (cfg && typeof cfg.tripwireMaxFileSizeKb === 'number') {
      return cfg.tripwireMaxFileSizeKb;
    }
  } catch {}
  return 100;
}
function getTripwireMaxLines() {
  try {
    const cfg = loadCfg();
    if (cfg && typeof cfg.tripwireMaxLines === 'number') {
      return cfg.tripwireMaxLines;
    }
  } catch {}
  return 800;
}
function getWatchedExtensions() {
  const defaultExts = [
    '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go',
    '.java', '.kt', '.kts', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.rb',
    '.php', '.swift', '.dart', '.fs', '.vb', '.scala', '.m', '.mm',
  ];
  try {
    const cfg = loadCfg();
    if (cfg && Array.isArray(cfg.watchedExtensions) && cfg.watchedExtensions.length > 0) {
      return new Set(cfg.watchedExtensions.map((x) => x.startsWith('.') ? x.toLowerCase() : '.' + x.toLowerCase()));
    }
  } catch {}
  return new Set(defaultExts);
}
function main() {
  const ov = projectOverride();
  if (ov === 'off') return;
  if (rcMode() === 'off') return;
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  // trim() also strips a leading BOM some shells prepend when piping stdin.
  try { input = JSON.parse(raw.trim()); } catch { return; }

  const f = input && input.tool_input && input.tool_input.file_path;
  if (!f) return;
  // Convert to absolute normalized path to prevent subdirectory bugs
  const normF = path.resolve(process.cwd(), f);
  const watchedExts = getWatchedExtensions();
  if (!watchedExts.has(path.extname(normF).toLowerCase())) return;

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
  // (Phoenix #3: ≤100ms with scan). Default cap 100KB (tripwireMaxFileSizeKb) to
  // prevent CPU lock and token bloat.
  try { if (fs.statSync(normF).size > getTripwireMaxFileSizeKb() * 1024) return; } catch { return; }
  let lines;
  try { lines = fs.readFileSync(normF, 'utf8').split(/\r?\n/); } catch { return; }

  const smells = [];
  if (lines.some((l) => /^(<<<<<<< |>>>>>>> |=======$)/.test(l))) smells.push('merge-conflict markers');
  const maxLines = getTripwireMaxLines();
  if (lines.length > maxLines) smells.push(`file >${maxLines} lines (${lines.length})`);
  if (smells.length) {
    // One line per file — the stop hook reports each .smells line verbatim.
    try { fs.appendFileSync(base + '.smells', `${normF}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
