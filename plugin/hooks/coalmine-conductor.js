#!/usr/bin/env node
// CoalMine conductor (SessionStart) — injects the always-on offer rules so the
// suite drives itself: the user remembers no commands, the agent offers the
// right canary at the right moment, and every costly action asks first.
// Plain stdout becomes session context. Fail-silent, no network, ~0ms.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Onboarding offer is a separate line so .coalmine.json skipOnboarding can drop it.
const ONBOARDING = '- gold-standard (important): no "coalmine: verified" stamp in .claude/rules/, .agents/rules/, or AGENTS.md → offer /gold-standard ONCE this session (Run now / Queue / Skip; respect Skip). Re-offer when a stamp is past its revalidate date.';
const CONDUCTOR_HEAD = [
  '[CoalMine] 9 quality canaries installed. Conduct them (answer in the USER\'S language; offer via your question tool; never auto-run costly work without a chosen option):',
  '- rot-canary: hooks auto-scan touched files at session end (QUICK, capped via autoScanFileCap; offer the fix menu if a user is present). DEEP whole-repo scan only on request.',
];
const CONDUCTOR_TAIL = [
  '- Specialists — offer on domain entry (never auto-run): deps/packages → supply-chain-audit · schema/contract/serialization → drift-canary · async/retry/failure paths → resilience-audit · hot loops/queries/caches → scale-canary · tests/coupling/DI → testability-canary · logging/metrics/tracing → telemetry-canary · version-sensitive facts → source-grounding.',
  '- Honor every .coalmine.json override if present (the installed commented file documents all keys).',
  '- Self error-report: if a CoalMine component misbehaves, OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a user-reviewed summary — never auto-submit.',
];

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

// --- Self-update: persistent once-per-window throttle stamp -----------------
// Mirrors rot-canary-stop's deterministic sweep gate (Phoenix #8: no randomness,
// the date itself is the only sanctioned time input). The stamp is an ISO date
// at ~/.claude/.coalmine-update-check; the conductor reads it to decide if a
// KIND 1 update nudge is due, then rewrites it to today's date so the nudge
// fires at most once per updateCheckDays (no re-nag). Sandbox-compliant
// (Phoenix #10): only ~/.claude is touched.
const UPDATE_STAMP = '.coalmine-update-check';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Today as YYYY-MM-DD in UTC — deterministic for a given calendar day, no TZ drift
// between the write and the next read.
function todayISO(now) {
  return new Date(now).toISOString().slice(0, 10);
}

// Whole-day delta between two YYYY-MM-DD strings (b - a), or null if either is
// unparseable. Date.parse on a date-only string is UTC, matching todayISO.
function dayDiff(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (isNaN(ta) || isNaN(tb)) return null;
  return Math.floor((tb - ta) / MS_PER_DAY);
}

function updateStampPath() {
  return path.join(os.homedir(), '.claude', UPDATE_STAMP);
}

function readUpdateStamp() {
  try {
    return fs.readFileSync(updateStampPath(), 'utf8').trim();
  } catch {
    return null;
  }
}

// Due when there is no stamp, a corrupt stamp, or the window has elapsed.
function updateDue(stamp, today, days) {
  if (!stamp) return true;
  const d = dayDiff(stamp, today);
  if (d === null) return true; // unparseable stamp → self-heal by treating as due
  return d >= days;
}

// Crash-safe write: write to a temp sibling then atomically rename over the stamp,
// so a kill mid-write can never leave a half-written (then unparseable) stamp.
function writeUpdateStamp(today) {
  try {
    const dir = path.join(os.homedir(), '.claude');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const final = path.join(dir, UPDATE_STAMP);
    const tmp = final + '.tmp';
    fs.writeFileSync(tmp, today, 'utf8');
    fs.renameSync(tmp, final);
  } catch {}
}

// --- Self-update: KIND 1 directive per updateMode ---------------------------
// English directives, localized by the agent — same convention as every other
// conductor line (HEAD: "answer in the USER'S language"). Returns the line to
// inject, or null for modes that emit nothing for kind 1.
function updateDirective(mode, days) {
  switch (mode) {
    case 'ask':
      return `- CoalMine self-update (ask the user ONCE via your question tool, in their language): "How should CoalMine keep itself current?" Offer 3 — **auto** (I check for a newer version about every ${days} days and apply updates when you approve; ~1-2K tokens per check), **remind** (a free periodic reminder; you run \`claude plugin update coalmine@coalmine\` yourself), **off** (no reminders). Save the choice: \`node scripts/configure.mjs --updateMode <auto|remind|off>\` (run from the CoalMine repo). Do not check now — the saved mode drives future sessions.`;
    case 'auto':
      return '- CoalMine self-update (standing consent — do this now): follow /coalmine:update to web-check the latest CoalMine tag vs the installed plugin.json version. If newer, OFFER `claude plugin update coalmine@coalmine` + `/reload-plugins`; if current, say "up to date"; if git/network is unavailable, say so and suggest updating manually later (never assume).';
    case 'remind':
      return `- CoalMine self-update reminder (relay to the user in their language, no action needed): it has been ~${days}d since the last CoalMine update-check — consider \`claude plugin update coalmine@coalmine\` to refresh, or switch to auto (\`node scripts/configure.mjs --updateMode auto\`).`;
    default:
      return null; // 'off' (or unknown) → nothing for kind 1
  }
}

// --- Self-update: KIND 2 gold-rule revalidate scan (free, local) ------------
// Lifts /coalmine:stats past-due detection to an automatic SessionStart nudge —
// but NOT the same date-math as stats.md (corrected 2026-07-09: the old claim
// was false off-default). This hook uses the stamp's OWN literal `revalidate Nd`
// as the threshold directly; /coalmine:stats instead uses the stamp's Nd only to
// PICK a config key (30d -> platformRuleRevalidateDays, 90d -> ruleRevalidateDays)
// and applies THAT key's value — the two agree only while those keys sit at their
// factory defaults (30/90, matching the stamps' own baked-in numbers) and diverge
// the moment either is customized. `ruleRevalidateDays` is this hook's ONLY
// config consumer, and only as a fallback when a stamp is malformed and has no
// parseable Nd (rare). `platformRuleRevalidateDays`, `definitionRevalidateDays`,
// `platformDefinitionRevalidateDays` have NO consumer here: the platform-rule key
// would need the very Nd that's missing when the fallback fires (circular); the
// two definition-* keys govern a different corpus entirely (installed skills'
// references/*.md) that only /coalmine:stats scans. All three are
// /coalmine:stats-only by design, not dead config.
// Local file reads only — no spend, no network.
//
// A cheap global opener locates each stamp; the capturing pattern then runs over
// only a bounded slice per opener. The capturing pattern's two lazy [\s\S]*?
// backtrack O(n^2) on a poisoned .md (an opener with no closing `-->`, or many
// `revalidate Nd` hits before one), so running it whole-file was a quadratic DoS
// reachable on every SessionStart when a cloned/untrusted repo carries a large
// poisoned rule file. Bounding the input the capturing pattern ever sees to a
// constant makes per-opener cost O(1) (so O(n) over the file). Mirrors the same
// STAMP_WINDOW guard in scripts/lib/consistency.mjs (v3.7.9 CM-1).
const STAMP_OPEN = /<!--\s*coalmine:\s*verified/g;
const STAMP_RE = /<!--\s*coalmine:\s*verified\s+(\d{4}-\d{2}-\d{2})([\s\S]*?)-->/;
const REVALIDATE_RE = /revalidate\s+(\d+)d/;
// A real stamp is ~80-150 chars; a well-formed stamp fits easily, a poisoned blob
// can never grow the regex's work past this bound.
const STAMP_WINDOW = 2048;

function countPastDueStamps(roots, today, cfg) {
  let count = 0;
  // clamp: a raw negative/0/NaN ruleRevalidateDays would mark every stamp past-due
  // (mass false nagging). Floor to >=1 day (same class as the other config clamps).
  const generalFallback = (cfg && Number.isFinite(cfg.ruleRevalidateDays)) ? Math.max(1, Math.floor(cfg.ruleRevalidateDays)) : 90;
  const scanFile = (p) => {
    let body;
    try { body = fs.readFileSync(p, 'utf8'); } catch { return; }
    STAMP_OPEN.lastIndex = 0;
    let o;
    while ((o = STAMP_OPEN.exec(body)) !== null) {
      // Match the full stamp only within a bounded slice anchored at this opener.
      const m = STAMP_RE.exec(body.slice(o.index, o.index + STAMP_WINDOW));
      if (m) {
        const rev = m[2].match(REVALIDATE_RE);
        const days = rev ? Number(rev[1]) : generalFallback;
        const d = dayDiff(m[1], today);
        if (d !== null && d > days) count++;
      }
      // Advance past this opener so a zero-length global match can't loop, and
      // overlapping openers inside one window are still each considered.
      if (STAMP_OPEN.lastIndex <= o.index) STAMP_OPEN.lastIndex = o.index + 1;
    }
  };
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) scanFile(p);
    }
  };
  for (const r of roots) {
    let st;
    try { st = fs.statSync(r); } catch { continue; }
    if (st.isDirectory()) walk(r);
    else scanFile(r); // AGENTS.md (a file, not a dir)
  }
  return count;
}

function pastDueDirective(n) {
  return `- CoalMine rule freshness: ${n} gold-standard rule(s) are past their revalidate date — OFFER /gold-standard RE-VALIDATE via your question tool (Run now / Queue / Skip), in the user's language. Local check only; the user runs it.`;
}

// The KIND 2 scan roots for a project root (shared by the CC and AG paths).
function ruleRoots(root) {
  return [
    path.join(root, '.claude', 'rules'),
    path.join(root, '.agents', 'rules'),
    path.join(root, 'AGENTS.md'),
  ];
}

// Cheap existence check (HOOK-LEAN, 2026-07-15): unlike countPastDueStamps this needs no date
// math or window-bounded capture -- it only asks "is there a stamp at all", so it can
// short-circuit on the very first hit. Used to auto-suppress the onboarding offer once the repo
// has been gold-standard'd at least once (no need to keep suggesting a first run every session).
function hasVerifiedStamp(roots) {
  const fileHasStamp = (p) => {
    let body;
    try { body = fs.readFileSync(p, 'utf8'); } catch { return false; }
    STAMP_OPEN.lastIndex = 0;
    return STAMP_OPEN.test(body);
  };
  const dirHasStamp = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() ? dirHasStamp(p) : (e.name.endsWith('.md') && fileHasStamp(p))) return true;
    }
    return false;
  };
  for (const r of roots) {
    let st;
    try { st = fs.statSync(r); } catch { continue; }
    if (st.isDirectory() ? dirHasStamp(r) : fileHasStamp(r)) return true;
  }
  return false;
}

// Builds the head+onboarding+tail scaffold, deciding onboarding suppression against the given
// BASE cwd (skipOnboarding config flag, or a verified stamp ANYWHERE in that base's rule roots —
// either silences it). `base` MUST be the same cwd source the caller's own KIND-2 revalidate
// scan resolves: CC/FileCopy pass process.cwd() (the hook process IS the workspace there);
// AG/Gemini pass their payload-resolved cwd (the hook process may start elsewhere on those
// platforms) — else a verified-stamp repo can still draw a redundant onboarding offer because
// the check looked in the wrong directory. Self-contained fail-safe (never throws, defaults to
// NOT suppressing on any internal error, same as the pre-carve default).
function buildLines(cfg, base) {
  let skipOnboarding = false;
  try { skipOnboarding = !!(cfg && cfg.skipOnboarding === true) || hasVerifiedStamp(ruleRoots(findGitRoot(base))); } catch {}
  return skipOnboarding ? [...CONDUCTOR_HEAD, ...CONDUCTOR_TAIL] : [...CONDUCTOR_HEAD, ONBOARDING, ...CONDUCTOR_TAIL];
}

// --- Antigravity adapter -----------------------------------------------------
// AG mode = an event-name argv (the AG hooks.json template runs
// `node <this file> PreInvocation`; Claude Code invokes with no argv; Gemini's
// own 'SessionStart' argv and the file-copy platforms' 'FileCopy' argv are
// claimed by their own branches in main() and never reach this adapter — see
// the argv table in main()).
// Antigravity never fires SessionStart, and PreInvocation fires on EVERY model
// call — so the injection is guarded to ONCE per session by an atomic marker
// keyed by the payload's session, in a private coalmine/ subdir of os.tmpdir()
// (Phoenix #10 sandbox; rot-canary-stop's stale sweep collects it, Phoenix #1 —
// see the coalmine/ pass in sweepStale()). Emit = the sanctioned single-line
// {"additionalContext": ...} JSON, camelCase key. KIND 1 (self-update) is
// deliberately NOT injected on AG: its directives drive `claude plugin update` /
// configure.mjs — Claude Code plugin machinery; AG installs by file-copy, and
// firing here would also consume the CC-side once-per-window stamp. KIND 2
// (rule freshness) is local + platform-neutral and rides the one guarded
// injection.
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function agMain(cfg, updateMode) {
  let input = null;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8').trim()); } catch {}
  if (!input || typeof input !== 'object') return; // no payload → no session key → skip silently (Phoenix #12)
  const key = [input.session_id, input.sessionId, input.transcript_path, input.transcriptPath]
    .find((v) => typeof v === 'string' && v);
  if (!key) return; // un-keyable session: an injection would repeat per model call — skip (fail-closed on spend)
  // Atomic once-per-session latch (CodeQL js/insecure-temporary-file +
  // js/file-system-race — one-flock fix with CoalHearth/CoalFace). The marker
  // lives in a private per-tool subdir (mode 0o700 — closes the shared-/tmp
  // exposure on Unix, a no-op on Windows) and is created with the `wx` flag
  // (O_CREAT|O_EXCL): the write atomically FAILS with EEXIST if the path
  // already exists in ANY form (a prior model call's marker, or a planted
  // file/symlink) — that EEXIST IS the "already injected this session" signal,
  // killing the old check-then-write TOCTOU race AND refusing to write through
  // a symlink target in one syscall.
  // The wx flag guards the marker FILE; the subdir needs its own guard: mkdirSync(recursive)
  // SILENTLY succeeds on a PRE-PLANTED symlink at markerDir (following it, the 0o700 mode NOT
  // applied), so the wx marker would then write THROUGH it into an attacker's dir. lstatSync
  // (does NOT follow the link) rejects a symlink subdir before the write — routed to the SAME
  // per-repo branch as a marker-write failure (CF/CM fail-closed skip; CH emits with the note).
  // FAIL-CLOSED (named divergence from CoalHearth's AG shim, which emits + a
  // "may repeat" note on a write failure): CH's payload is a RECOVERY block —
  // losing it risks losing work, so repeating is the lesser evil. This
  // conductor's payload is ADVISORY, like CoalFace's — repeating it on every
  // model call IS the spam this guard exists to prevent — so ANY create
  // failure (EEXIST, or an unwritable tmp) skips the emit entirely (token
  // burn > one missed nudge).
  const markerDir = path.join(os.tmpdir(), 'coalmine');
  const marker = path.join(markerDir, `ag-conductor-${djb2(key)}.marker`);
  try {
    fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
    if (fs.lstatSync(markerDir).isSymbolicLink()) return; // dir-symlink residual -> fail-closed (see above)
    fs.writeFileSync(marker, '', { flag: 'wx' });
  } catch { return; } // EEXIST (already ran) OR any write failure -> fail-closed, no emit
  // Resolved ONCE, shared by the onboarding check (buildLines) and KIND 2 below — the payload's
  // cwd is authoritative when present (the hook process's own cwd is not guaranteed to be the
  // workspace on AG).
  const base = (typeof input.cwd === 'string' && input.cwd) || process.cwd();
  const lines = buildLines(cfg, base);
  if (updateMode !== 'off') {
    try {
      const n = countPastDueStamps(ruleRoots(findGitRoot(base)), todayISO(Date.now()), cfg);
      if (n > 0) lines.push(pastDueDirective(n));
    } catch {}
  }
  process.stdout.write(JSON.stringify({ additionalContext: lines.join('\n') }) + '\n');
}

// --- Gemini CLI adapter -------------------------------------------------------
// Gemini mode = the literal argv 'SessionStart' (the gemini-settings-hooks.json
// template runs `node <this file> SessionStart`) — disjoint from AG's argv
// values (PreInvocation) and from CC's no-argv invocation, so the three never
// collide (checked by exact match in main(), BEFORE the AG truthy check).
// Unlike AG's PreInvocation (fires on EVERY model call, needing the marker
// guard above), Gemini's SessionStart genuinely fires once per session — no
// marker/session-key machinery needed, fire as-is. Content mirrors the AG
// path: KIND 1 (self-update) stays excluded (its directives drive
// `claude plugin update` / configure.mjs — Claude Code plugin machinery;
// Gemini installs by file-copy like AG, and firing here would also consume
// the shared CC-side update stamp); KIND 2 (rule freshness) is local +
// platform-neutral and always runs. Output is the NESTED
// {"hookSpecificOutput":{"additionalContext": ...}} shape
// geminicli.com/docs/hooks/reference documents for SessionStart (verified
// 2026-07-15) — distinct from AG's flat {"additionalContext": ...}: the bug
// this adapter fixes, since the old code routed Gemini through agMain, whose
// flat shape Gemini's SessionStart hook silently drops.
function geminiMain(cfg, updateMode) {
  // Honor the payload's cwd exactly like agMain (one-flock): the hook process's
  // own cwd is not guaranteed to be the workspace; a stdin payload cwd is
  // authoritative when present. Absent/garbage stdin → fall back to
  // process.cwd() (a no-op when Gemini supplies no cwd). Resolved ONCE, shared
  // by the onboarding check (buildLines) and KIND 2 below.
  let input = null;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8').trim()); } catch {}
  const base = (input && typeof input.cwd === 'string' && input.cwd) || process.cwd();
  const lines = buildLines(cfg, base);
  if (updateMode !== 'off') {
    try {
      const n = countPastDueStamps(ruleRoots(findGitRoot(base)), todayISO(Date.now()), cfg);
      if (n > 0) lines.push(pastDueDirective(n));
    } catch {}
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext: lines.join('\n') } }) + '\n');
}

function main() {
  let updateMode = 'ask';
  let updateCheckDays = 14;
  let cfg = null;
  try {
    cfg = loadCfg();
    if (cfg && (cfg.enableConductor === false || cfg.conductor === false)) return; // legacy key honored
    const disabled = cfg && (cfg.disabledCanaries !== undefined ? cfg.disabledCanaries : cfg.disable); // legacy key honored
    if (Array.isArray(disabled) && (disabled.includes('conductor') || disabled.includes('all'))) return;
    if (cfg && typeof cfg.updateMode === 'string') {
      const v = cfg.updateMode.toLowerCase();
      if (v === 'ask' || v === 'auto' || v === 'remind' || v === 'off') updateMode = v;
    }
    if (cfg && Number.isInteger(cfg.updateCheckDays) && cfg.updateCheckDays >= 1 && cfg.updateCheckDays <= 365) {
      updateCheckDays = cfg.updateCheckDays;
    }
  } catch {}

  // Gemini mode (argv === 'SessionStart', see the Gemini adapter above) —
  // checked FIRST, before the generic-truthy AG branch below.
  if (process.argv[2] === 'SessionStart') { geminiMain(cfg, updateMode); return; }

  // File-copy mode (argv === 'FileCopy' — the platform-configs for Copilot CLI /
  // Kiro / Augment / Devin CLI / Junie): platforms whose hook OUTPUT contract is
  // (best-guess) the plain CC stdout shape, but whose INSTALL is a file-copy,
  // not the CC plugin. Identical to the CC path below EXCEPT KIND 1
  // (self-update) is skipped, stamp write included: its directives drive
  // `claude plugin update` / configure.mjs — CC plugin machinery, a wrong
  // instruction on a file-copy install — and firing would consume the shared
  // ~/.claude/.coalmine-update-check stamp, throttling a co-installed real CC's
  // own nudge for ~updateCheckDays (the same exclusion AG and Gemini already
  // make). KIND 2 (local, platform-neutral) still rides. Exact-match BEFORE the
  // generic-truthy AG branch, same ordering rule as Gemini: a named mode must
  // never fall through into the AG shape.
  const fileCopy = process.argv[2] === 'FileCopy';

  // AG mode: any OTHER truthy argv → the Antigravity adapter (once-per-session
  // marker guard + additionalContext emit). The config gates above already ran.
  // Never 'SessionStart' or 'FileCopy' — those argv values are claimed above.
  if (process.argv[2] && !fileCopy) { agMain(cfg, updateMode); return; }

  // CC / file-copy path: process.cwd() IS the workspace here (unlike AG/Gemini, whose hook
  // process may start elsewhere) — the onboarding check reads it directly, same cwd source
  // this same path's own KIND 2 below uses.
  const lines = buildLines(cfg, process.cwd());

  // KIND 1 — skill version. Throttled by the persistent stamp: fires at most once
  // per updateCheckDays. 'off' emits nothing and skips the stamp entirely.
  // File-copy mode skips ALL of it, stamp included (see the FileCopy note above).
  if (!fileCopy && updateMode !== 'off') {
    try {
      const today = todayISO(Date.now());
      if (updateDue(readUpdateStamp(), today, updateCheckDays)) {
        const directive = updateDirective(updateMode, updateCheckDays);
        if (directive) lines.push(directive);
        writeUpdateStamp(today); // throttle → no re-nag until the window elapses
      }
    } catch {}
  }

  // KIND 2 — gold-rule revalidate. Free + local, gated only by updateMode !== 'off'
  // (not the update stamp): runs every session start like the onboarding offer.
  if (updateMode !== 'off') {
    try {
      const roots = ruleRoots(findGitRoot(process.cwd()));
      const today = todayISO(Date.now());
      const n = countPastDueStamps(roots, today, cfg);
      if (n > 0) lines.push(pastDueDirective(n));
    } catch {}
  }

  process.stdout.write(lines.join('\n'));
}

try { main(); } catch {}
