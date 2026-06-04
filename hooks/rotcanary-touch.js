#!/usr/bin/env node
// Code-Health Tier 1 (PostToolUse: Write|Edit|MultiEdit) — cross-platform (Node).
// Records touched code files for the session + flags unambiguous tripwires. Always non-blocking (exit 0).
const fs = require('fs');
const os = require('os');
const path = require('path');

const CODE_EXT = new Set([
  '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go',
  '.java', '.kt', '.kts', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.rb',
  '.php', '.swift', '.dart', '.fs', '.vb', '.scala', '.m', '.mm',
]);

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }

  const f = input && input.tool_input && input.tool_input.file_path;
  if (!f) return;
  if (!CODE_EXT.has(path.extname(f).toLowerCase())) return;

  const sid = input.session_id || 'nosession';
  const base = path.join(os.tmpdir(), `rotcanary-${sid}`);
  const touched = base + '.touched';

  let existing = [];
  try { existing = fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean); } catch {}
  if (!existing.includes(f)) { try { fs.appendFileSync(touched, f + '\n'); } catch {} }

  let lines;
  try { lines = fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { return; }

  const smells = [];
  if (lines.some((l) => /^(<<<<<<< |>>>>>>> |=======$)/.test(l))) smells.push('merge-conflict markers');
  if (lines.length > 800) smells.push(`file >800 lines (${lines.length})`);
  if (smells.length) {
    try { fs.appendFileSync(base + '.smells', `${f}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
process.exit(0);
