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
// SAFER-VALUE-WINS GUARD (corrected 2026-07-09 — the old blanket "no guard
// needed, unlike CoalWash" verdict was HALF-WRONG): `updateMode` IS read by a
// hook (the conductor) and drives a real consent escalation (an 'auto' check
// spends tokens + networks unsolicited) — an untrusted project config must not
// be able to flip an explicit global 'off' up to 'auto'. Guarded below,
// mirroring CoalWash's mergeSafety (config-load.mjs). `autoFixMode` is the one
// true exception: it is read by the AGENT from the raw file, never by any hook
// via this merge, so a hook-side guard for IT would protect nothing — that half
// of the old verdict stands.
const SAFER_ENUM = { updateMode: ['off', 'remind', 'ask', 'auto'] }; // index 0 = safest
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
      // Constrain ONLY when BOTH layers set the key explicitly (global absent =
      // project free); an unknown value on either side leaves the shallow-merge
      // result untouched.
      for (const [key, order] of Object.entries(SAFER_ENUM)) {
        if (!globalCfg || !projectCfg || globalCfg[key] === undefined || projectCfg[key] === undefined) continue;
        const gi = order.indexOf(globalCfg[key]);
        const pi = order.indexOf(projectCfg[key]);
        if (gi === -1 || pi === -1) continue; // unknown value: leave the shallow-merge result
        merged[key] = pi <= gi ? projectCfg[key] : globalCfg[key]; // project may not be LOUDER than global
      }
      _cfg = merged;
    }
  } catch {}
  return _cfg;
}
// </coalmine-shared: node-config>

// Defensive edited-file-path extraction across hook payload shapes so the SAME
// hook serves both Claude Code and Antigravity (one core, no fork):
//   Claude Code:  input.tool_input.file_path
//   Antigravity:  input.toolCall.args.<name> (camelCase toolCall) — the AG
//                 PostToolUse payload is not fully documented, so try the common
//                 field names and skip silently when none is present (Phoenix #12).
// The AG PostToolUse matcher gates on edit tools (like CC's Write|Edit|MultiEdit),
// so a read tool's path arg does not reach here in practice; CC shape is tried
// first, keeping CC behavior byte-identical.
function extractEditedPath(input) {
  if (!input || typeof input !== 'object') return null;
  const bags = [input.tool_input, input.toolInput, input.toolCall && input.toolCall.args];
  for (const bag of bags) {
    if (bag && typeof bag === 'object') {
      for (const k of ['file_path', 'filePath', 'path', 'filename', 'file']) {
        if (typeof bag[k] === 'string' && bag[k]) return bag[k];
      }
    }
  }
  return null;
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

// Scratch-space exclude (2026-07-25, dogfood-found): os.tmpdir() is where THIS hook
// keeps its OWN session state (rot-canary-<sid>.*) and where an agent's own throwaway
// scratchpad/harness files live (e.g. a long IC campaign's one-shot harness .mjs under
// the session scratchpad, which sits INSIDE os.tmpdir()) — never ship code, so it must
// never enter the touched/memmoved set. This is a scan-SCOPE exclude, not a security
// boundary: a lexical resolve-and-contain is correct (a missed symlinked-temp edge just
// means the file gets scanned — harmless), no realpath/fail-closed needed. This is the
// SAME asymmetric-derivation shape as isTestFile below and is deliberately NOT
// canonicalized here (ruling 2026-07-26): the miss direction is EXTRA SCANNING (noise),
// never a wrong exemption and never a safety hole, so the lexical compare stays rather
// than hardening a guard with no reachable defect. Boundary-safe
// (a trailing path.sep — "<tmp>X" must never match "<tmp>"); case-insensitive on win32,
// mirroring the isWin precedent used for the .touched dedup below.
function isUnderTmpdir(absPath) {
  const tmp = path.resolve(os.tmpdir());
  let p = path.resolve(absPath);
  let t = tmp;
  if (process.platform === 'win32') { p = p.toLowerCase(); t = t.toLowerCase(); }
  return p === t || p.startsWith(t + path.sep);
}

// Size-tripwire exemptions (coding-style.md amended 2026-07-26): 800 is a review
// SIGNAL, not a cap — the finding is an UNDECLARED over-run. A source file
// crossing tripwireMaxLines with a top-of-file declaration comment is compliant,
// and test files are out of scope entirely (their cohesion unit is the module
// under test). Neither exemption touches the merge-conflict tripwire or the
// .touched recording — the stop-scan still sees the file.
//
// A declaration = a head-of-file comment naming a marker + a line count:
//   // ponytail: <N> lines at declaration — <why splitting would reduce cohesion>
// `waiver:` is accepted alongside `ponytail:` — the tree reached for that word
// independently before the rule existed (scripts/lib/hooks.test.mjs:6). The N is
// HISTORY, not a live claim — deliberately NOT compared to the current count (a
// drifted number must not reopen the finding; that re-sync churn is what the
// amendment killed). Head-bounded: "top-of-file" per the rule, and a mid-file
// ponytail comment that happens to say "<N> lines" about something else must not
// silence the tripwire (deepest real declaration in the flock sits at the end of
// a header block — CoalLedger md-ast.mjs; re-derive with grep, don't trust a
// pinned line number here).
//
// LOOSE ON PURPOSE, and the boundary is measured, not assumed: this pattern also
// matches prose that merely mentions a line count (`/* ponytail: dropped 900
// lines of dead code */`, or that text inside a string literal) — both silence
// the tripwire, verified by probe. Tightening to the rule's literal
// `<N> lines at declaration` form would re-break every declaration the flock
// already wrote, INCLUDING hooks.test.mjs:6, which is the exact cry-wolf case
// this exemption exists to fix — so the looseness is accepted, not overlooked.
// The property that holds instead, and is designed for: the literal `<N>` form
// carries no digits, so the feature's OWN documentation cannot self-silence —
// this comment, config-schema.mjs, the .coalmine.json template and the PS twin's
// comment all still FLAG if they ever cross the cap (probe-verified).
//
// The 2048 slice is the ReDoS bound (mirrors STAMP_WINDOW in coalmine-conductor.js,
// v3.7.9 CM-1): lazy `.*?` before `\d+` backtracks quadratically in LINE LENGTH, and
// a poison line is reachable at shipped defaults — 100k digits + 801 short lines is
// 99.2 KB, under the 100 KB tripwireMaxFileSizeKb cap. Measured through this hook:
// 5424 ms unbounded vs 57 ms control; ~3 ms sliced. Phoenix #3 is ≤100 ms WITH a scan,
// and this is a PostToolUse hook that re-runs on every edit to that file.
const SIZE_DECLARATION_RE = /(?:ponytail|waiver):.*?\d+\s*lines/i;
const SIZE_DECLARATION_HEAD = 30;
const SIZE_DECLARATION_WINDOW = 2048; // no real declaration puts its digits past column 2048
function hasSizeDeclaration(lines) {
  const head = Math.min(lines.length, SIZE_DECLARATION_HEAD);
  for (let i = 0; i < head; i++) {
    if (SIZE_DECLARATION_RE.test(lines[i].slice(0, SIZE_DECLARATION_WINDOW))) return true;
  }
  return false;
}

// Test-file classifier — naming CONVENTIONS, not path identity: basename markers
// (.test./.spec./test_/_test. and friends, delimiter-anchored so contest.js never
// matches) plus test-directory segments, compared case-insensitively on every
// platform (a convention check, not the volume case-folding trap). Segments are
// consulted only BELOW the project root (findGitRoot of the resolution base) so
// an unlucky ancestor like /home/test cannot classify a whole tree as tests and
// silently retire the tripwire for that user.
// ponytail: delimiter-less suffix names (FooTests.cs, FooTest.java) are missed
// unless a test dir places them — extend the basename regex if that class shows
// up flagged in practice.
// NAMED RESIDUAL (the ancestor guard leaks in one config): findGitRoot CLIMBS PAST a
// non-git workspace, so when an OUTER repo owns the .git, a workspace dir merely
// NAMED test/spec becomes an in-root segment — <outer>/test/proj/src/big.js is then
// silently exempt for that whole subtree. Narrow config, silent-miss failure mode.
// Deliberately not "fixed" by anchoring on baseDir instead: that only trades this
// miss for a different one (a hook launched with cwd below the real root).
const TEST_DIR_SEGMENTS = new Set(['test', 'tests', '__tests__', 'spec', 'specs']);
// The two sides of the segment compare are derived INDEPENDENTLY — the root from
// process.cwd(), the file from the tool payload — so they can be two different
// SPELLINGS of one directory and the `..` guard below then rejects a path that is
// really inside the root. Measured: macOS CI went red here while ubuntu+windows
// passed, because process.cwd() is kernel-resolved to /private/var/... while the
// payload still says /var/... (.native also expands a Windows 8.3 alias, per
// node/runtime.md section 4). Canonicalize BOTH sides — never one — and never key
// this on a platform name: a symlinked tmpdir is a VOLUME property, and a
// platform test would be wrong on a symlinked-tmp Linux box in the other direction.
// Unresolvable (file already gone) degrades to the lexical compare, which fails
// CLOSED in the exemption sense: no exemption, the tripwire still fires.
//
// DELIBERATE, CONSIDERED INVERSION of node/runtime.md §4 ("fail closed on an
// unresolvable path, never fall back to a lexical resolve") — named here so a future
// §4 audit grepping realpathSync+catch finds a marker instead of a defect. §4 governs
// a CONTAINMENT/authorization compare, where the privileged outcome is "proceed", so a
// lexical fallback there could let something through. Here the privileged outcome is
// the EXEMPTION, so the same fallback DENIES it — the closed direction. The inversion
// is safe because of THIS call site, not because of the helper.
// ponytail: `physical()` is deliberately general-purpose but is NOT safe for a
// containment compare — its catch is fail-OPEN for anything whose privileged outcome
// is "proceed". Reusing it to guard a write/delete needs §4's fail-closed catch
// (rethrow / refuse), not this one.
// Nuance, NOT a defect: if BOTH sides fall back, the compare succeeds lexically and an
// exemption can be granted — unreachable on the live path (the only caller runs after
// the file was opened and read, so its dirname provably exists) and the blast radius is
// one un-emitted advisory line.
function physical(p) {
  try { return fs.realpathSync.native(p); } catch { return path.resolve(p); }
}
function isTestFile(absPath, baseDir) {
  const bn = path.basename(absPath).toLowerCase();
  if (/(^|[._-])(test|spec)s?[._-]/.test(bn)) return true;
  const rel = path.relative(physical(findGitRoot(baseDir)), physical(path.dirname(absPath)));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false; // at/outside the root: basename verdict only
  return rel.split(path.sep).some((s) => TEST_DIR_SEGMENTS.has(s.toLowerCase()));
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

  const f = extractEditedPath(input);
  if (!f) return;
  // Resolve a relative path against the payload's workspace when provided (AG launches
  // the hook with its own cwd = the hooks.json dir; CC's payload cwd equals
  // process.cwd(), so this is a no-op on CC — an absolute file_path ignores the base
  // either way). workspacePaths[0] = the current AG spec's field (re-derived
  // 2026-07-23); cwd stays as the CC + legacy fallback.
  const wsBase = Array.isArray(input.workspacePaths) ? input.workspacePaths[0] : undefined;
  const baseDir = (typeof wsBase === 'string' && wsBase)
    || ((typeof input.cwd === 'string' && input.cwd) ? input.cwd : process.cwd());
  const normF = path.resolve(baseDir, f);

  // Never record a file living under the hook's own os.tmpdir() — throwaway lab/scratch
  // (the session scratchpad, a one-shot harness), never ship code. Checked BEFORE
  // anything is recorded, ahead of the MEMORY.md marker branch below (a temp-resident
  // MEMORY.md must not set .memmoved either — temp files count for nothing) and ahead
  // of the watched-extension gate.
  if (isUnderTmpdir(normF)) return;

  // No session key → no consumer (the stop hook bails without one). Record nothing.
  // conversationId = the CURRENT AG spec's session field (re-derived 2026-07-23);
  // session_id (CC's documented core field) + camelCase sessionId stay as fallbacks.
  // MUST match the stop hook's chain — it reads the rot-canary-<sid> state keyed here.
  // (Parsed BEFORE the code-extension gate since the memory-drift marker below
  // needs it for non-code files too; a non-conforming sid still records nothing.)
  const sid = input.conversationId || input.session_id || input.sessionId;
  // Phoenix #10 (sandbox): allowlist the session_id so a traversal-shaped sid (e.g.
  // ../../etc/x) cannot escape os.tmpdir() via path.join. Non-conforming -> bail (fail-silent).
  // AG constraint: Antigravity's session_id format is undocumented — a sid outside this
  // allowlist records nothing there (safe degrade; fail-closed over widening without
  // evidence. The 2026-07-12 AG pilot's cadence DID fire, so real AG sids passed it).
  if (!sid || typeof sid !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sid)) return;
  const base = path.join(os.tmpdir(), `rot-canary-${sid}`);

  // Memory-drift exit-gate marker (2026-07-24): a MEMORY.md edit (any directory) is
  // not a watched code extension, so record it as a 0-byte .memmoved marker BEFORE
  // the extension gate returns — the stop hook's drift check reads it to decide
  // "code moved but MEMORY did not". Swept with the other rot-canary-* temp.
  if (path.basename(normF).toLowerCase() === 'memory.md') {
    // Atomic wx create (O_CREAT|O_EXCL): EEXIST = already recorded this session —
    // swallowed by the catch. No existsSync pre-check (that was a TOCTOU window,
    // js/insecure-temporary-file); wx also refuses to write through a pre-planted
    // symlink. Name stays sid-scoped flat tmp like the sibling .touched/.smells
    // state (the session-UUID makes it unpredictable — the dismissed-FP class).
    try { fs.writeFileSync(base + '.memmoved', '', { flag: 'wx' }); } catch {}
    return; // .md is never in the watched code-extension set — nothing else to record
  }

  const watchedExts = getWatchedExtensions();
  if (!watchedExts.has(path.extname(normF).toLowerCase())) return;
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
  // Exemption order: the cheap count check short-circuits first (happy path pays
  // nothing); the classifier + declaration scan run only on an over-run.
  if (lineCount > maxLines && !isTestFile(normF, baseDir) && !hasSizeDeclaration(lines)) {
    smells.push(`file >${maxLines} lines (${lineCount})`);
  }
  if (smells.length) {
    // One line per file — the stop hook reports each .smells line verbatim.
    try { fs.appendFileSync(base + '.smells', `${normF}: ${smells.join('; ')}\n`); } catch {}
  }
}

try { main(); } catch {}
