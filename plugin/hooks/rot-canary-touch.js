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

// <coalmine-shared: node-config> — synced from hooks/_shared/node-config.js by build-plugin; edit the partial, not this block
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

// One BOM- and comment-tolerant JSONC read. Strips // and /* */ comments outside
// strings: the string alternative consumes an escaped char (\\.) or any
// non-quote/non-backslash char, so a value ending in \\ terminates the string
// correctly instead of leaking escape state into the next token (which would
// mis-strip a later //-containing string → silent revert).
function readCfgFile(file) {
  try {
    const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/"(?:\\.|[^"\\])*"|\/\/.*|\/\*[\s\S]*?\*\//g, (m) => (m[0] === '"' ? m : ''));
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
}

// Two-level cached read of .coalmine.json: the global ~/.claude/.coalmine.json
// overlaid per key by the project <gitroot>/.coalmine.json (project wins).
// __proto__/constructor/prototype keys are dropped at merge (an untrusted
// project config must not pollute the prototype). Cached — one disk pass per
// invocation (Phoenix #3: budget the work, not the process).
// NOTE: NO safer-value-wins guard here (unlike CoalWash) BY DESIGN — every
// hook-read key is Phoenix-13 side-effect-free (report / nudge / scan, nothing
// deleted or auto-edited), so a project override has no safety choice to weaken;
// and the one auto-EDIT key (autoFixMode) is read by the AGENT from the raw file,
// not by any hook via this merge, so a hook-side guard would protect nothing.
let _cfg;
function loadCfg() {
  if (_cfg !== undefined) return _cfg;
  _cfg = null;
  try {
    const globalCfg = readCfgFile(path.join(os.homedir(), '.claude', '.coalmine.json'));
    const projectCfg = readCfgFile(path.join(findGitRoot(process.cwd()), '.coalmine.json'));
    if (globalCfg || projectCfg) {
      const merged = {};
      for (const src of [globalCfg, projectCfg]) {
        if (!src) continue;
        for (const key of Object.keys(src)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          merged[key] = src[key];
        }
      }
      _cfg = merged;
    }
  } catch {}
  return _cfg;
}
// </coalmine-shared: node-config>

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
    // clamp: a raw project value of 0 / negative / NaN would break the size gate
    // (same class as the tempSweepStaleDays clamp). Floor to a positive integer.
    if (cfg && Number.isFinite(cfg.tripwireMaxFileSizeKb)) {
      return Math.max(1, Math.floor(cfg.tripwireMaxFileSizeKb));
    }
  } catch {}
  return 100;
}
function getTripwireMaxLines() {
  try {
    const cfg = loadCfg();
    if (cfg && Number.isFinite(cfg.tripwireMaxLines)) {
      return Math.max(1, Math.floor(cfg.tripwireMaxLines));
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
  // Phoenix #10 (sandbox): allowlist the session_id so a traversal-shaped sid (e.g.
  // ../../etc/x) cannot escape os.tmpdir() via path.join. Non-conforming -> bail (fail-silent).
  if (!sid || typeof sid !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sid)) return;
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
  let lines;
  try {
    const fd = fs.openSync(normF, 'r');
    try {
      // statSync->readFileSync on a path is a TOCTOU; fstat + read on one fd is not,
      // and still skips large files before reading (Phoenix #3 latency budget).
      const size = fs.fstatSync(fd).size;
      if (size > getTripwireMaxFileSizeKb() * 1024) return;
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, 0);
      lines = buf.toString('utf8').split(/\r?\n/);
    } finally {
      fs.closeSync(fd);
    }
  } catch { return; }

  const smells = [];
  // A real merge conflict always has an angle-bracket opener/closer. Key the tripwire
  // on those: a bare '=======' line is a common ASCII section banner in source comments,
  // so flag only when a '<<<<<<< '/'>>>>>>> ' line is present (the bracket IS the signal;
  // the '=======' divider alone never fires, so it needs no separate test).
  if (lines.some((l) => /^(<<<<<<< |>>>>>>> )/.test(l))) smells.push('merge-conflict markers');
  const maxLines = getTripwireMaxLines();
  // A file with exactly maxLines content lines + a trailing newline splits to maxLines+1
  // elements; drop that single trailing empty element so a file AT the cap is not flagged.
  const lineCount = lines.length - (lines[lines.length - 1] === '' ? 1 : 0);
  if (lineCount > maxLines) smells.push(`file >${maxLines} lines (${lineCount})`);
  if (smells.length) {
    // One line per file — the stop hook reports each .smells line verbatim.
    try { fs.appendFileSync(base + '.smells', `${normF}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
