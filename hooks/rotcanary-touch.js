#!/usr/bin/env node
// Code-Health Tier 1 (PostToolUse: Write|Edit|MultiEdit) — cross-platform (Node).
// Records touched code files for the session + flags unambiguous tripwires. Always non-blocking (exit 0).
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mode: ~/.claude/.rotcanary-mode = auto|manual|off (absent = auto). .rotcanary-off = off (back-compat).
// off → record nothing. auto & manual → record touched files (the tripwire).
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

const CODE_EXT = new Set([
  '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go',
  '.java', '.kt', '.kts', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.rb',
  '.php', '.swift', '.dart', '.fs', '.vb', '.scala', '.m', '.mm',
]);

function main() {
  if (rcMode() === 'off') return;
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }

  const f = input && input.tool_input && input.tool_input.file_path;
  if (!f) return;
  if (!CODE_EXT.has(path.extname(f).toLowerCase())) return;

  // No session id → no consumer (the stop hook bails without one). Record nothing.
  const sid = input.session_id;
  if (!sid) return;
  const base = path.join(os.tmpdir(), `rotcanary-${sid}`);
  const touched = base + '.touched';

  let existing = [];
  try { existing = fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean); } catch {}
  const isWin = process.platform === 'win32';
  const fCompare = isWin ? f.toLowerCase() : f;
  const existingCompare = isWin ? existing.map((x) => x.toLowerCase()) : existing;
  if (!existingCompare.includes(fCompare)) { try { fs.appendFileSync(touched, f + '\n'); } catch {} }

  // Tripwire scan — skip very large files to stay inside the latency budget
  // (Phoenix #3: ≤100ms with scan).
  try { if (fs.statSync(f).size > 1024 * 1024) return; } catch { return; }
  let lines;
  try { lines = fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { return; }

  const smells = [];
  if (lines.some((l) => /^(<<<<<<< |>>>>>>> |=======$)/.test(l))) smells.push('merge-conflict markers');
  if (lines.length > 800) smells.push(`file >800 lines (${lines.length})`);
  if (smells.length) {
    // One line per file — the stop hook reports each .smells line verbatim.
    try { fs.appendFileSync(base + '.smells', `${f}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
process.exit(0);
