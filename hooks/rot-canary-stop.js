#!/usr/bin/env node
// Code-Health Tier 2 (Stop) — cross-platform (Node).
// At a natural stop, if code was edited this session, ask the agent to run the rot-canary
// skill at DEPTH=QUICK on the touched files. Loop-guarded (stop_hook_active), one-shot per
// edit-batch, kill-switchable via ~/.claude/.rot-canary-off.
//
// ponytail: 833 lines at declaration — a Claude Code hook SHIPS AND RUNS AS ONE STANDALONE
// FILE (`hooks.json` invokes it as `node <this file>`, and build-plugin.mjs INLINES the
// hooks/_shared partials into it for exactly that reason), so a split would need either a
// runtime require of a sibling — which breaks the copy-one-file install the AG/PS/manual
// paths rely on — or a bundler, which Phoenix #2 (zero-dep) forbids. The over-run is the
// cost of that shipping model, not of low cohesion: the file is one hook's single Stop path.
// N is HISTORY (dates this judgement); `wc -l` is the live count.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mode: ~/.claude/.rot-canary-mode = auto|manual|off (absent = auto). .rot-canary-off = off (back-compat).
// Only AUTO emits the session-end nudge (manual/off do not).
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

function readFirstChunk(p, size = 4096) {
  let fd;
  try {
    fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(size);
    const bytesRead = fs.readSync(fd, buf, 0, size, 0);
    return buf.toString('utf8', 0, bytesRead);
  } catch {
    return '';
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

// <coalmine-shared: node-config> — synced from hooks/_shared/node-config.js by build-plugin; edit the partial, not this block
// The three per-agent-dir shapes were added by the namespace campaign
// (#69+#39, owner-designated 2026-08-08) alongside the LEGACY dotfile: a
// project configured ONLY through the new shape (no `.git` present) would
// otherwise match nothing and fall through to the raw `startDir` fallback —
// the exact per-subdir-scatter class hooks-safety.md §8 (the phantom-slug
// law) already names for a wrongly-anchored state root. Additive-only: each
// new marker can only make the walk stop LOWER/narrower, `.git` is checked
// first and still wins wherever it is present.
const ROOT_MARKERS = [
  '.git',
  '.claude/coal/coalmine.json', '.agents/coal/coalmine.json', '.gemini/coal/coalmine.json',
  '.coalmine.json',
];

function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (ROOT_MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) {
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

// Namespace campaign (#69+#39, owner-designated 2026-08-08). Per-project
// config lives under an agent dir, never bare at the project root any more.
// THE READ ORDER IS A RAIL — identical wording in every room's readCfg
// comment and README Configure section, one flock:
//   1. <project>/.<the running agent's OWN dir>/coal/<skill>.json — the dir
//      of the agent actually executing. CoalMine activates ONLY through
//      Claude Code's own hook system (SessionStart/PostToolUse/Stop, plus the
//      AG/Gemini/FileCopy adapters riding these SAME files); it has no other
//      running-agent identity to branch on, so for THIS room "own dir" is
//      always `.claude` and collapses onto the first entry of step 2 below
//      rather than needing a separate check.
//   2. Other known agent dirs, fixed order: `.claude` -> `.agents` ->
//      `.gemini` (first FOUND wins).
//   3. LEGACY: <project>/.<skill-dotfile>.json at the project root (today's
//      shape) — read normally, no breakage for an existing user.
// WRITE target = where the config was found; absent everywhere, the FIRST
// agent dir the project already has ON DISK (`.claude` -> `.agents` ->
// `.gemini`), never a bare "own dir" default — a project that only uses
// `.agents`/`.gemini` must not get a foreign `.claude/` planted into it. No
// agent dir present at all -> the running agent's own dir (`.claude`), same
// as before this fix. Hooks never perform this move on a READ (Phoenix #5,
// no side effects) — the move-on-CONFIG-WRITE half lives in configure.mjs
// and install.mjs (scripts/lib/config-paths.mjs), which are the only writers.
const AGENT_DIR_ORDER = ['.claude', '.agents', '.gemini'];
function projectConfigCandidates(root) {
  const candidates = AGENT_DIR_ORDER.map((d) => path.join(root, d, 'coal', 'coalmine.json'));
  candidates.push(path.join(root, '.coalmine.json')); // LEGACY, always last
  return candidates;
}
// Fresh-default path when NO config exists anywhere (kept in sync by hand
// with scripts/lib/config-paths.mjs's own copy, INSPECT MEDIUM 2, 2026-08-08):
// the first AGENT_DIR_ORDER entry that already exists as a directory on
// disk, else `.claude` -- never a bare candidates[0], which would plant a
// foreign `.claude/` into a project that only uses `.agents`/`.gemini`. This
// hook never WRITES the project config (Phoenix #5) -- projectConfigPath
// below calls this only to know what a fresh-install READ resolves to (a
// missing file there is treated as absent, same as any other candidate).
function isDirMarker(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
function ownDirDefault(root) {
  const dir = AGENT_DIR_ORDER.find((d) => isDirMarker(path.join(root, d))) ?? AGENT_DIR_ORDER[0];
  return path.join(root, dir, 'coal', 'coalmine.json');
}
function projectConfigPath(root) {
  const candidates = projectConfigCandidates(root);
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return ownDirDefault(root); // nothing found anywhere -- own-dir is both the read and write target
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
// overlaid per key by the project config (project wins). Per-project config
// now lives under an agent dir (namespace campaign #69+#39, owner-designated
// 2026-08-08) — see `projectConfigPath`'s own header above for the full read
// order and the LEGACY root-dotfile fallback it still honors.
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
// TWO DEFECTS CLOSED (board #112, 2026-08-13 — audited CoalWash's current
// `mergeSafety`/config-load.mjs and CoalBoard's current
// hooks/coalboard-conductor.js SAFER_ENUM before writing this, per
// hooks-safety.md §9's own warning that its exemplar shipped this exact hole):
// (1) an ABSENT global was treated as "project free" (`!globalCfg` skipped the
// clamp entirely) — the common case, since most users never write a global
// config — so a project-only .coalmine.json could set 'auto' unchallenged.
// Fixed: an absent/unset global now reads as its SCHEMA DEFAULT
// (scripts/lib/config-schema.mjs — not imported here, Phoenix #2 zero-dep,
// mirrored the same way CoalBoard's own SAFER_ENUM carries its `default`
// inline), never "anything goes". (2) CW H5 case-fold bug: `order.indexOf`
// compared raw case, so a project value in a different case than the
// lowercase enum (e.g. 'AUTO') missed the lookup (-1), fell through `continue`,
// and won through the earlier shallow-merge unclamped. Fixed: both sides are
// lowercased before the lookup.
// THREE MORE KEYS CLOSED (board #113, 2026-08-13 — board #112's own named
// next-touch set): `enableConductor`/`rotCanaryMode`/`disabledCanaries` were
// entirely unclamped — a project config could silently re-enable a
// globally-disabled canary or the whole conductor. `enableConductor` is a
// boolean-as-enum-of-two (`[false, true]`, false = safest); `fold()` below
// passes a non-string through unchanged instead of stringifying it, so a
// boolean pair compares correctly (a raw `.toLowerCase()` on `false` would
// still technically work via implicit String() coercion, but the OLD
// `order.indexOf(String(v).toLowerCase())` shape compared a STRING against
// an array of actual booleans and would silently never match — this is the
// bug the dispatch warned about, not a hypothetical). `rotCanaryMode` is a
// plain 3-value string enum, same shape as `updateMode`.
// LEGACY-ALIAS ESCALATION (found auditing the read sites, not assumed):
// `enableConductor`/`rotCanaryMode`/`disabledCanaries` each have a legacy
// alias (`conductor`/`mode`/`disable`) read independently at every call
// site. A clamp that only ever writes the NEW key name leaves the legacy
// field exactly as the plain shallow-merge left it — unclamped — so a
// project expressing its escalation through the OLD key name alone sails
// through untouched, regardless of what the new-key clamp does. Two
// different read-site shapes need two different closes:
//   - rotCanaryMode/mode and disabledCanaries/disable read as "prefer the
//     new key if defined, else the legacy one" (`cfg.X !== undefined ? cfg.X
//     : cfg.legacyX`) — so the clamp resolves EACH SIDE's effective value
//     through that same fallback (via/viaArr below) before comparing, and
//     writes the clamped result into the CANONICAL (new) key name only; the
//     read site's own preference-for-new-when-defined then makes the legacy
//     field's stale content moot.
//   - enableConductor/conductor reads as `cfg.enableConductor === false ||
//     cfg.conductor === false` — an OR over BOTH raw fields independently,
//     not a preference chain. Writing only the new key would leave a
//     project's raw `conductor: true` unclamped and able to flip the OR
//     back to false=false=not-disabled when global's actual stance (via
//     either name) was false. So this key's clamp result is mirrored into
//     BOTH `merged.enableConductor` and `merged.conductor`. NOT blanket
//     harmless for the preference-chain keys too, one named shape (INSPECT,
//     board #113 findings-back): a SINGLE project object setting BOTH names
//     to OPPOSITE values (`{enableConductor:true, conductor:false}`, no
//     global) had the legacy `conductor:false` win pre-clamp (OR sees a
//     literal false, disables) and now sees the mirror's `true` instead
//     (OR sees two trues, enables) — the mirror overwrites the user's own
//     self-contradictory legacy value with the canonical field's winning
//     result. No security consequence (the no-config baseline is already
//     enabled; nothing escalates past an explicit GLOBAL choice, which is
//     what this guard exists to defend), but "harmless" overstated this one
//     self-contradictory-input shape.
function fold(v) { return typeof v === 'string' ? v.toLowerCase() : v; } // pass booleans through unchanged
function via(obj, key, legacyKey) { // effective scalar value for `key`, preferring the new name (matches every read site's own `!== undefined` chain)
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  return legacyKey ? obj[legacyKey] : undefined;
}
function viaArr(obj, key, legacyKey) { // same preference, array-shaped (for UNION keys)
  if (!obj) return undefined;
  if (Array.isArray(obj[key])) return obj[key];
  if (legacyKey && Array.isArray(obj[legacyKey])) return obj[legacyKey];
  return undefined;
}
const SAFER_ENUM = {
  updateMode: { order: ['off', 'remind', 'ask', 'auto'], default: 'ask' },
  enableConductor: { order: [false, true], default: true, legacy: 'conductor' }, // index 0 = safest; default = config-schema.mjs's declared factory default (README Configure table)
  rotCanaryMode: { order: ['off', 'manual', 'auto'], default: 'auto', legacy: 'mode' },
};
// UNION-MERGE KEYS (hooks-safety.md section 9): a strArr key here is QUIETEN-only —
// more entries can only REDUCE what a hook acts on, never escalate spend/consent — so
// the project layer may ADD to the global layer's list, never silently drop an entry
// from it by replacing the whole array. scanExcludePaths is a scan-scope exclude: a
// project adding its own lab-tooling fragment must not erase a global one.
// PRECONDITION for any key added here: its factory default must be the EMPTY array.
// disabledCanaries (board #113): more entries = more disabled = quieter, the same
// QUIETEN-only direction — a project clearing the array must not silently re-enable
// what an explicit global disabled. `lower: true` here mirrors config-schema.mjs's own
// declared normalization for this key (enforced by the CLI on write, NOT by a
// hand-edited JSON file) — folded here so the read sites' `disabled.includes('rot-canary')`
// (a raw, case-sensitive check) can't be defeated by a stray "ROT-CANARY" in either layer.
const UNION_ARRAY_KEYS = {
  scanExcludePaths: { default: [] },
  disabledCanaries: { default: [], lower: true, legacy: 'disable' },
};
let _cfg;
function loadCfg() {
  if (_cfg !== undefined) return _cfg;
  _cfg = null;
  try {
    const globalCfg = readCfgFile(path.join(os.homedir(), '.claude', '.coalmine.json'));
    const projectCfg = readCfgFile(projectConfigPath(findGitRoot(process.cwd())));
    if (globalCfg || projectCfg) {
      const merged = {};
      for (const src of [globalCfg, projectCfg]) {
        if (!src) continue;
        for (const key of Object.keys(src)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          merged[key] = src[key];
        }
      }
      // Constrain whenever the PROJECT sets the key (via either name) — an
      // absent global is its schema default, never "no preference to
      // defend" (board #112). Case-fold both sides before the ordered
      // lookup so a differently-cased project value cannot dodge the clamp
      // (the CW H5 shape); fold() passes non-strings through, so a boolean
      // enum compares correctly too (board #113).
      for (const [key, { order, default: def, legacy }] of Object.entries(SAFER_ENUM)) {
        const projectVal = via(projectCfg, key, legacy);
        if (projectVal === undefined) continue; // project expressed no opinion via either name
        const globalVal = via(globalCfg, key, legacy);
        const globalValue = globalVal !== undefined ? globalVal : def;
        const gi = order.indexOf(fold(globalValue));
        const pi = order.indexOf(fold(projectVal));
        if (gi === -1 || pi === -1) continue; // unknown value: leave the shallow-merge result
        // Store the CANONICAL member (order[i]), never the raw-cased winner: a
        // consumer that trusts the merge output and compares with strict === --
        // rotCanaryMode's `mode === 'off' || mode === 'manual'` in rot-canary-stop.js/
        // touch.js does exactly this, unlike updateMode's own consumer, which
        // happens to .toLowerCase() defensively -- would silently fail to
        // recognize a legitimately-entered 'OFF' as 'off', the same storage trap
        // CoalWash's own K1 finding already named ("compared the folded spelling
        // but stored the RAW one"). Caught here before this shipped (board #113).
        const result = order[pi <= gi ? pi : gi]; // project may not be LOUDER than the (explicit-or-default) global
        merged[key] = result;
        if (legacy) merged[legacy] = result; // mirror so an OR-shaped read site (enableConductor/conductor) can't be fooled by a stale legacy field
      }
      // Same effective-value resolution as SAFER_ENUM above (via either the
      // new or legacy key name), but the safer direction for an array is
      // UNION (dedup), not "pick one side" — either side may add.
      for (const [key, { default: def, lower, legacy }] of Object.entries(UNION_ARRAY_KEYS)) {
        const projectArr = viaArr(projectCfg, key, legacy);
        if (projectArr === undefined) continue; // project expressed no opinion via either name
        const globalArr = viaArr(globalCfg, key, legacy) ?? def; // absent global = its schema default ([]), never "nothing to union"
        const foldFn = lower ? fold : (v) => v;
        const result = [...new Set([...globalArr, ...projectArr].map(foldFn))];
        merged[key] = result;
        if (legacy) merged[legacy] = result;
      }
      // Unconditional normalization, independent of the union branch above:
      // a global-only or project-only disabledCanaries/disable array (the
      // OTHER side never touched it, so the union guard's `continue` never
      // ran) still needs case-folding — config-schema.mjs's `lower: true`
      // is enforced by the CLI on write, not by a hand-edited file, and the
      // read sites' `.includes('rot-canary')` checks are case-sensitive.
      for (const k of ['disabledCanaries', 'disable']) {
        if (Array.isArray(merged[k])) merged[k] = merged[k].map(fold);
      }
      _cfg = merged;
    }
  } catch {}
  return _cfg;
}
// </coalmine-shared: node-config>

// Heuristic user-language detection: explicit .coalmine.json override first, then
// env locale, then regional characters in project docs (per hooks-safety.md section 5).
function detectLang() {
  try {
    const cfg = loadCfg();
    if (cfg && typeof cfg.language === 'string' && TRANSLATIONS[cfg.language.toLowerCase()]) {
      return cfg.language.toLowerCase();
    }
  } catch {}
  try {
    const langEnv = (process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANGUAGE || '').toLowerCase();
    if (langEnv.includes('th')) return 'th';
    if (langEnv.includes('ja') || langEnv.includes('jp')) return 'ja';
    if (langEnv.includes('zh') || langEnv.includes('cn')) return 'zh';
    if (langEnv.includes('es')) return 'es';

    const root = findGitRoot(process.cwd());
    for (const file of ['README.md', 'MEMORY.md', 'AGENTS.md']) {
      const p = path.join(root, file);
      if (fs.existsSync(p)) {
        const content = readFirstChunk(p);
        if (/[฀-๿]/.test(content)) return 'th';
        if (/[぀-ヿ㐀-䶿一-鿿]/.test(content)) {
          if (/[぀-ゟ゠-ヿ]/.test(content)) return 'ja';
          return 'zh';
        }
      }
    }
  } catch {}
  return 'en';
}

// Phoenix #1 (zero garbage): delete this session's temp state once the batch is
// acknowledged, and sweep rot-canary-* files older than the configured age left
// behind by sessions that never reached a second stop (crash/kill).
function cleanupSession(base) {
  for (const f of [base + '.touched', base + '.smells', base + '.scanned', base + '.memmoved']) {
    try { fs.unlinkSync(f); } catch {}
  }
}
function getTempSweepStaleDays() {
  try {
    const cfg = loadCfg();
    // Clamp at read time to a positive integer (floor 1, not 0) — the schema bound
    // (min:1) is enforced only by verify.mjs over the factory config, never at hook
    // read time. A raw 0 pushes the cutoff to "now": sweepStale() runs BEFORE this
    // session's own .touched/.smells/.scanned markers are read below, so a marker
    // written earlier THIS session already has an mtime < "now" and 0 deletes it too
    // — silently suppressing this session's own end-of-scan nudge, on top of
    // deleting every concurrent session's fresh temp. A negative value pushes the
    // cutoff further into the future (same bug, worse); a fractional value skews
    // the cutoff. NaN/non-finite → the factory default (7), matching the schema.
    if (cfg && typeof cfg.tempSweepStaleDays === 'number' && Number.isFinite(cfg.tempSweepStaleDays)) {
      return Math.max(1, Math.floor(cfg.tempSweepStaleDays));
    }
  } catch {}
  return 7;
}
function sweepStale(canaryActive) {
  try {
    const tmp = os.tmpdir();
    // Deterministic throttle (Phoenix #8 — no randomness): the marker file's mtime
    // gates the whole-tmpdir scan to at most once per 24h on this machine. The
    // marker is a 0-byte machine-level gate, not session garbage — it is excluded
    // from the sweep, and if the OS clears tmp the next stop simply sweeps again.
    //
    // CWK-031/U8: this marker used to sit FLAT in the shared tmp ROOT under a fixed,
    // predictable name, written with the default 'w' flag — which FOLLOWS a symlink at
    // the destination (node/runtime.md §5). On Unix the shared /tmp let any local user
    // pre-plant a link at that name and have the victim's next Stop truncate the target.
    // Two changes close it, and the SHAPE is the interesting half:
    //   1. it moved into the private per-tool subdir (mode 0o700, same one the AG
    //      conductor already uses and that this function already sweeps below), plus the
    //      conductor's own lstatSync guard — mkdirSync(recursive) SILENTLY succeeds on a
    //      pre-planted symlink at markerDir, following it with the 0o700 mode NOT applied,
    //      so the dir needs a guard of its own or the file write lands through it.
    //   2. the write is per-pid-temp + renameSync, NOT the `wx` flag the sibling markers
    //      use. `wx` is correct for a WRITE-ONCE latch (rot-canary-touch.js's .memmoved,
    //      the conductor's once-per-session marker) where EEXIST IS the signal — but this
    //      marker is a 24h gate whose mtime must RE-STAMP on every sweep. Bare `wx` would
    //      fail EEXIST the moment the file exists, the catch would swallow it, the mtime
    //      would freeze, and after the first 24h the sweep would then run on EVERY stop
    //      forever. rename REPLACES a directory entry instead of writing through it, so it
    //      refuses the symlink AND keeps the overwrite semantics the throttle needs.
    //      Same-device by construction: the temp is created in the destination's own dir.
    const markerDir = path.join(tmp, 'coalmine');
    const marker = path.join(markerDir, 'rot-canary-sweep.marker');
    try {
      // lstat, not stat: it stats the LINK, never the target, so we can neither read a
      // throttle decision through a planted link nor write through one.
      //
      // The `isSymbolicLink()` arm is load-bearing, not decoration — lstat does NOT throw on
      // a link, it returns the LINK's own stat (INSPECT M1: the first version of this comment
      // claimed a planted link "reads as no marker", which is measurably false — a
      // just-created link has an mtime of ~now, so without this arm the gate takes the
      // `< 24h` branch, returns early, and the link SURVIVES while suppressing every sweep,
      // refreshable by the planter forever: no write-through, but an unbounded temp-cleanup
      // DoS, INSPECT L1). A link here is never OUR gate whatever its mtime says, so it is
      // treated as "no marker" DELIBERATELY; the check is free, the stat is already in hand.
      //
      // What that buys, stated by link TYPE rather than as one blanket claim (measured both,
      // because the over-claim is the exact defect this arm was bounced for):
      //   - ANY link type: the gate is never obeyed, so the sweep always runs. That alone
      //     closes L1 — suppression is what the DoS needed.
      //   - FILE-type link: `renameSync` below replaces the directory entry, so the link is
      //     also GONE afterwards. Self-healing, and the target is untouched (rename does not
      //     follow the link).
      //   - DIRECTORY-type link (a Windows junction, `symlink(...,'dir')`): rename onto it
      //     fails EPERM, the catch unlinks the stamp, and the sweep still runs. The link
      //     PERSISTS — never obeyed, never written through, but not self-healed. Do not
      //     restate "rename replaces it" unqualified; that is only the file-link case.
      const st = fs.lstatSync(marker);
      if (!st.isSymbolicLink() && Date.now() - st.mtimeMs < 24 * 60 * 60 * 1000) return;
    } catch {} // no marker yet → sweep now
    const stamp = path.join(markerDir, `.sweep-${process.pid}.tmp`);
    try {
      // `mode` applies only when mkdir CREATES the dir — it is silently a no-op if the dir
      // already exists (INSPECT N1), so this hardens the dir we make, it does not re-harden
      // one somebody else made. Not a live hole: no shipped version ever created this dir
      // without a mode (it did not exist at v3.10.0, and arrived at v3.11.0 already 0o700),
      // and both writers we ship pass it. The residual is a third party pre-creating it
      // world-writable, which we would not tighten.
      fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
      if (fs.lstatSync(markerDir).isSymbolicLink()) return; // dir-symlink → fail-closed, no write, no sweep
      // `mode: 0o600` is defence-in-depth for the residual named at the `mkdirSync` call
      // above, not alert-appeasement: when the dir already exists, mkdir's `mode` is a no-op, so a
      // third party who pre-created `<tmp>/coalmine` world-writable leaves it permissive —
      // and in exactly that case this file's own default mode (0o666 & ~umask) is all that
      // stands between the stamp and another user. `flag: 'wx'` stays and is doing separate
      // work (O_EXCL refuses a pre-planted name, link or not); it is not what mode replaces.
      // It also closes CodeQL js/insecure-temporary-file #66/#67, whose sink fires on a
      // temp-dir write with no `mode` (or a mode whose low 6 bits are not all zero) —
      // re-derived from the query source: it reads the mode argument ONLY, never the flag,
      // the dir's 0o700, the lstat guards, or filename randomness. A random suffix, the
      // other fix proposed for this, would not have closed it.
      fs.writeFileSync(stamp, '', { flag: 'wx', mode: 0o600 });
      fs.renameSync(stamp, marker);
    } catch {
      // Never leave the per-pid temp behind (Phoenix #1). This covers the EXCEPTION path
      // only — process death between the write and the rename escapes it (no in-process
      // cleanup survives SIGKILL, scripts-quality.md's own stated limit), which is why the
      // subdir sweep below also reaps a stale `.tmp` rather than only `*.marker` (INSPECT L3).
      try { fs.unlinkSync(stamp); } catch {}
    }
    const staleDays = getTempSweepStaleDays();
    const cutoff = Date.now() - (staleDays * 24 * 60 * 60 * 1000);
    for (const f of fs.readdirSync(tmp)) {
      // No exclusion for the old flat-root `rot-canary-sweep.marker` any more: since
      // CWK-031/U8 the live gate lives in the coalmine/ subdir, so a flat-root copy is a
      // PRE-U8 leftover and must be collected like any other stale canary temp (the
      // no-old-version-leftover standard). It matches isCanaryTemp by prefix, so it is
      // canary-owned and follows the canary-owned rule below — collected on the active
      // path only, exactly like the rest of this hook's own temp.
      const isCanaryTemp = f.startsWith('rot-canary-') || f.startsWith('rotcanary-');
      // A leftover PRE-2026-07-15 flat-tmp-root AG conductor marker (the CodeQL
      // js/insecure-temporary-file fix relocated new markers into the coalmine/
      // subdir below; this branch only still catches markers a not-yet-updated
      // install already wrote flat here). Named divergence from the PS twin:
      // the AG adapter requires node, so a no-Node box can never have
      // coalmine-conductor-* markers to sweep.
      const isConductorMarker = f.startsWith('coalmine-conductor-');
      if (!isCanaryTemp && !isConductorMarker) continue;
      // The canary's OWN temp is swept only on the active path ("a disabled
      // canary does no work", Node≡PS parity) — but the CONDUCTOR's markers are
      // collected regardless of rot-canary mode: they belong to a different,
      // independently-enabled feature whose ONLY collector is this hook, so
      // gating them here leaked one marker per AG session forever whenever
      // rot-canary was off/manual but the conductor stayed on (Phoenix #1).
      if (isCanaryTemp && !canaryActive) continue;
      const p = path.join(tmp, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
    // The AG conductor's once-per-session markers now live in a private
    // per-tool subdir (os.tmpdir()/coalmine/, mode 0o700 — the same CodeQL
    // fix) instead of loose in the tmp root; sweep it too, or the fixed
    // conductor's own markers would never get collected (Phoenix #1).
    // Conductor-owned → unconditional, like the flat-root migration pass above.
    // markerDir declared above — the throttle marker now lives here too (CWK-031/U8).
    let markerFiles = [];
    try { markerFiles = fs.readdirSync(markerDir); } catch {} // absent on a CC-only / no-AG box
    for (const f of markerFiles) {
      if (f === 'rot-canary-sweep.marker') continue; // the throttle gate itself, re-stamped moments ago
      // `.tmp` too, not just `*.marker` (INSPECT L3): the rename stamp is unlinked on the
      // exception path, but process death between the write and the rename strands one that
      // nothing else we own could ever collect. A live stamp exists for microseconds and the
      // cutoff is >= 1 day (clamped), so anything this reaps is definitionally dead.
      if (!f.endsWith('.marker') && !f.endsWith('.tmp')) continue;
      const p = path.join(markerDir, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}

// scanExcludePaths (2026-07-30, USER standing rule: "skip lab tools, never skip
// shipped code"): a path-fragment / lightweight-glob exclude for throwaway lab
// tooling (scratch probes, one-shot harnesses) so it never consumes a slot the
// touched-files auto-scan would rather give a real file. Deliberately NOT a full
// glob engine (Phoenix #2: zero-dep, no npm glob lib) — a literal fragment is a
// case-insensitive substring match against the touched file's resolved path,
// and '*' is a wildcard (zero or more of anything) for a simple glob shape like
// "**/scratchpad/**" — fragments use '/' as the portable separator (matched
// against the touched path with '\' normalized to '/', so a POSIX-style
// fragment works on a Windows-separated path too). This is a scan-SCOPE
// convenience, never a security boundary: the user writes the fragment, so a
// mistake stays SCOPED to what they wrote — it cannot silently exempt code the
// user didn't ask to exempt. It CAN silently disable the WHOLE auto-scan if the
// fragment is over-broad (a bare '*'/'**' matches every path) — the skip-count
// clause in the nudge (below) is the visibility net for that case, not a
// prevention.
function getScanExcludePaths() {
  try {
    const cfg = loadCfg();
    if (cfg && Array.isArray(cfg.scanExcludePaths)) {
      return cfg.scanExcludePaths.filter((x) => typeof x === 'string' && x);
    }
  } catch {}
  return [];
}
// LINEAR glob matcher (H1 round 2, 2026-07-30) — REPLACES a regex-based approach
// that stayed exploitable after the first ReDoS fix. Round 1 collapsed CONSECUTIVE
// '*' into one '.*' (fixing "****ZZZ"), but a fragment with SEPARATED wildcards
// ("a*a*a*...Z", the classic evil-regex shape) still compiles to multiple
// non-adjacent '.*' groups with no collapse to catch — measured live: a 10-star
// alternating fragment against a merely 30-char-longer non-matching path took
// 13.5s, growing exponentially with slack. Regex backtracking is the wrong tool
// for a '*'-only glob: this matcher never builds a regex at all. Split the
// fragment on '*', then walk the non-empty literal segments greedily with
// String.indexOf, advancing the search position past each match — the standard
// linear-time algorithm for '*'-only wildcard matching (provably correct: since
// '*' matches anything, the leftmost occurrence of the next segment can never
// leave LESS room for the rest, only more, so greedy-leftmost never produces a
// false negative). O(fragment length + path length), no backtracking, no regex
// engine in the hot path — the ReDoS class is eliminated by construction, not
// mitigated. A side effect: literal segments compare via plain substring, so a
// literal '?' (or any other character) needs no escaping at all — it is never
// regex-metachar-active in the first place.
function matchesFragment(path, frag) {
  const segments = frag.split('*');
  if (segments.length === 1) return path.includes(segments[0]); // no '*': plain substring match
  let pos = 0;
  for (const seg of segments) {
    if (seg === '') continue; // '**' / a leading or trailing '*' produce empty segments
    const idx = path.indexOf(seg, pos);
    if (idx === -1) return false;
    pos = idx + seg.length;
  }
  return true;
}
function matchesAnyExcludeFragment(filePath, fragments) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return fragments.some((frag) => matchesFragment(normalized, frag.toLowerCase()));
}

const TRANSLATIONS = {
  en: {
    smellPrefix: '\n\nTripwires flagged at edit time:\n',
    memoryDrift: '\n\nMemory-drift check: code changed this session but no MEMORY.md was updated — if this work is worth keeping, update the project MEMORY/status line + crystallize before ending. (Advisory; disable: memoryDriftNudge=false in .coalmine.json)',
    capNotice: '\n\n(Auto-scan capped at {N} files to prevent token leakage; remaining files can be scanned manually)',
    scanExcludeNotice: '\n\n({N} file(s) skipped per scanExcludePaths — lab/throwaway tooling only, never shipped code; autopilot is still running)',
    reason: (list, smellText) =>
      'Code-health auto-check (session end): code files were edited this session. Before stopping, ' +
      'invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:\n' +
      list + smellText +
      '\n\nReport CONFIRMED findings only (severity table; one line if none). If findings exist and a user is present, end by offering the fix menu via your question tool — never fix without a chosen option. (Disable: create ~/.claude/.rot-canary-off)',
  },
  th: {
    smellPrefix: '\n\nสัญญาณเตือนความเสี่ยงที่พบขณะแก้ไข:\n',
    memoryDrift: '\n\nตรวจ memory-drift: เซสชันนี้แก้โค้ดแต่ไม่มีการอัพเดต MEMORY.md — ถ้างานนี้ควรเก็บ ให้อัพเดต MEMORY/status line ของโปรเจกต์ + crystallize ก่อนจบ (advisory; ปิด: ตั้ง memoryDriftNudge=false ใน .coalmine.json)',
    capNotice: '\n\n(จำกัดการสแกนอัตโนมัติที่ {N} ไฟล์หลักเพื่อป้องกันโทเค็นรั่วไหล คุณสามารถสั่งสแกนไฟล์ที่เหลือแบบแมนวลได้)',
    scanExcludeNotice: '\n\n(ข้าม {N} ไฟล์ตาม scanExcludePaths — เฉพาะเครื่องมือแล็ป/ของชั่วคราว ไม่ใช่โค้ดที่ ship จริง ระบบยังทำงานปกติ)',
    reason: (list, smellText) =>
      'ระบบตรวจสอบสุขภาพโค้ดอัตโนมัติ (สิ้นสุดเซสชัน): มีการแก้ไขไฟล์โค้ดในเซสชันนี้ ก่อนที่คุณจะหยุดทำงาน ' +
      'โปรดเรียกใช้สกิล rot-canary ที่ DEPTH=QUICK โดยระบุ SCOPE = ไฟล์ที่แก้ไขเหล่านี้ + ไฟล์ที่เรียกใช้งานโดยตรง:\n' +
      list + smellText +
      '\n\nรายงานเฉพาะปัญหาที่ยืนยันแล้ว (ตารางความรุนแรง; ไม่มีก็สรุปบรรทัดเดียว) หากพบปัญหาและผู้ใช้อยู่ในเซสชัน ให้จบด้วยการเสนอเมนูแก้ไขผ่านเครื่องมือคำถาม — ห้ามแก้โดยไม่มีตัวเลือกที่ถูกเลือก (ปิดระบบนี้: สร้าง ~/.claude/.rot-canary-off)',
  },
  ja: {
    smellPrefix: '\n\n編集時に検出されたリスク警告:\n',
    memoryDrift: '\n\nMemory-driftチェック: このセッションでコードが変更されましたが MEMORY.md は更新されていません — 保持すべき作業なら、終了前にプロジェクトの MEMORY/status line を更新してください。(参考情報; 無効化: .coalmine.json で memoryDriftNudge=false)',
    capNotice: '\n\n(トークン漏洩を防ぐため、自動スキャンは主要{N}ファイルに制限されています。残りのファイルは手動でスキャンできます)',
    scanExcludeNotice: '\n\n(scanExcludePaths により{N}ファイルをスキップ — ラボ/使い捨てツールのみが対象、出荷コードは対象外。自動チェックは正常に動作中)',
    reason: (list, smellText) =>
      'コードヘルス自動チェック（セッション終了）: このセッションでコードファイルが編集されました。終了する前に、' +
      'DEPTH=QUICKでrot-canaryスキルを実行し、SCOPE = これらの編集されたファイル + 直接的呼び出し元を指定してください:\n' +
      list + smellText +
      '\n\n確認済みの問題のみ報告（重要度テーブル; なければ1行で）。問題がありユーザーが在席なら、質問ツールで修正メニューを提示して終了 — 選択なしの修正は禁止。（無効化: ~/.claude/.rot-canary-off を作成）',
  },
  zh: {
    smellPrefix: '\n\n编辑时标记的风险警告：\n',
    memoryDrift: '\n\nMemory-drift 检查：本会话修改了代码但未更新 MEMORY.md — 若此工作值得保留，请在结束前更新项目的 MEMORY/status line。（仅提示；停用: 在 .coalmine.json 设 memoryDriftNudge=false）',
    capNotice: '\n\n(为防止 Token 泄露，自动扫描限制为前 {N} 个主要文件；其余文件可手动扫描)',
    scanExcludeNotice: '\n\n(根据 scanExcludePaths 跳过了 {N} 个文件 — 仅限实验室/一次性工具，绝不包括已发布代码；自动检查仍在正常运行)',
    reason: (list, smellText) =>
      '代码健康自动检查（会话结束）：此会话中编辑了代码文件。在停止之前，请运行 DEPTH=QUICK 的 rot-canary 技能，' +
      '并将 SCOPE 设置为这些被编辑的文件及其直接调用者：\n' +
      list + smellText +
      '\n\n仅报告已确认的问题（严重性表格；没有则一行说明）。若有问题且用户在场，最后用问题工具提供修复菜单 — 未经选择不得修改。（停用: 创建 ~/.claude/.rot-canary-off）',
  },
  es: {
    smellPrefix: '\n\nAlertas de riesgo marcadas al editar:\n',
    memoryDrift: '\n\nComprobación memory-drift: se modificó código en esta sesión pero no se actualizó MEMORY.md — si este trabajo merece conservarse, actualice el MEMORY/status line del proyecto antes de terminar. (Consultivo; desactivar: memoryDriftNudge=false en .coalmine.json)',
    capNotice: '\n\n(Escaneo automático limitado a {N} archivos para evitar fugas de tokens; los archivos restantes se pueden escanear manualmente)',
    scanExcludeNotice: '\n\n({N} archivo(s) omitido(s) según scanExcludePaths — solo herramientas de laboratorio/desechables, nunca código publicado; el autopiloto sigue funcionando)',
    reason: (list, smellText) =>
      'Autocomprobación de salud del código (fin de sesión): se editaron archivos de código en esta sesión. Antes de detenerse, ' +
      'invoque la habilidad rot-canary con DEPTH=QUICK y SCOPE = estos archivos modificados + sus llamadores directos:\n' +
      list + smellText +
      '\n\nInforme solo hallazgos CONFIRMADOS (tabla de gravedad; una línea si no hay nada). Si hay hallazgos y el usuario está presente, termine ofreciendo el menú de correcciones — nunca corrija sin una opción elegida. (Desactivar: cree ~/.claude/.rot-canary-off)',
  },
};

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

function main() {
  // The sweep runs on EVERY stop, BEFORE the mode gates — but what it may touch
  // is ownership-split (see sweepStale): the CONDUCTOR's once-per-session
  // markers are always collected (their only collector is this hook; gating
  // them on rot-canary's mode leaked them forever when the canary was
  // off/manual but the conductor stayed on), while the canary's OWN temp is
  // swept only when the canary is active — a disabled/non-auto canary still
  // does none of ITS work (no scan, no nudge, its temp untouched), mirroring
  // the PS twin, which exits before its sweep when disabled/manual/off and,
  // having no AG adapter, never has conductor markers to collect.
  const ov = projectOverride();
  const canaryActive = ov !== 'off' && ov !== 'manual' && rcMode() === 'auto';
  sweepStale(canaryActive);
  if (!canaryActive) return;

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  // trim() also strips a leading BOM some shells prepend when piping stdin.
  try { input = JSON.parse(raw.trim()); } catch { return; }
  if (!input || input.stop_hook_active) return;

  // conversationId = the CURRENT AG spec's session field (re-derived 2026-07-23);
  // session_id/sessionId stay as the CC + legacy fallbacks. MUST match the touch
  // hook's chain — this hook reads the rot-canary-<sid> state the touch hook keys.
  const sid = input.conversationId || input.session_id || input.sessionId;
  // Phoenix #10 (sandbox): allowlist the session key so a traversal-shaped sid cannot
  // escape os.tmpdir() via path.join. Non-conforming -> bail (fail-silent, Phoenix #4).
  // AG constraint: Antigravity's session-key format is undocumented — a sid outside this
  // allowlist nudges nothing there (safe degrade; fail-closed over widening without
  // evidence. The 2026-07-12 AG pilot's cadence DID fire, so real AG sids passed it).
  if (!sid || typeof sid !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sid)) return;

  const base = path.join(os.tmpdir(), `rot-canary-${sid}`);
  const touched = base + '.touched';
  if (!fs.existsSync(touched)) return;

  let touchedMtime = 0;
  try { touchedMtime = fs.statSync(touched).mtimeMs; } catch { return; }

  const scanned = base + '.scanned';
  try {
    if (fs.existsSync(scanned)) {
      const content = fs.readFileSync(scanned, 'utf8').trim();
      // Unknown/legacy marker content (empty pre-v2.4 format) → 0 so the batch
      // re-nudges rather than being silently swallowed and deleted.
      const lastMtime = content ? Number(content) : 0;
      if (touchedMtime <= lastMtime) {
        // Batch already acknowledged on a previous stop — state no longer needed.
        cleanupSession(base);
        return;
      }
    }
  } catch {}

  let files = [];
  try {
    files = [...new Set(fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean).map((x) => path.normalize(x)))];
  } catch { return; }
  if (!files.length) return; // no recorded edit → nothing moved this session

  const lang = detectLang();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // The loud scan report can only target files that STILL EXIST; a file edited then
  // deleted this session (or a corrupt/garbage line) drops out of it. `files`
  // (recorded) still counts as "code moved" for the memory-drift check below;
  // `extant` gates the scan report. Empty extant with drift = the quiet-only case.
  const extantRaw = files.filter(fs.existsSync);

  // scanExcludePaths — filtered BEFORE the cap/slice logic below, so an excluded
  // lab file never consumes a cap slot a real file could have used. `files`
  // (recorded, unfiltered) still counts for the memory-drift check — an excluded
  // file is a scan-scope decision only, not a "nothing moved" claim.
  const excludeFrags = getScanExcludePaths();
  let skippedCount = 0;
  const extant = excludeFrags.length
    ? extantRaw.filter((f) => {
        if (matchesAnyExcludeFragment(f, excludeFrags)) { skippedCount++; return false; }
        return true;
      })
    : extantRaw;

  // Memory-drift exit-gate — QUIET, non-reporting (revamped v3.12.3; USER: "it's NOT
  // a canary, it should NOT display and report"). It never rides the loud rot scan
  // report: no severity table, no "invoke rot-canary skill", no fix menu, no blocking
  // Stop. Detection is UNCHANGED — a recorded code edit this session with no MEMORY.md
  // edit (.memmoved absent) — gated by the project using the MEMORY.md convention (root
  // MEMORY.md exists; read-only probe, Phoenix #10) and the memoryDriftNudge off-switch
  // (default ON). At emit the note rides `systemMessage` (board #82, 2026-08-08 — the
  // prior `hookSpecificOutput.additionalContext` shape forces a phantom second turn on
  // Stop that discards a `-p` session's `result` field; SessionStart/UserPromptSubmit
  // are unaffected, only Stop). A drift-only stop surfaces it alone (no block).
  // NAMED ceiling: the check is SESSION-GLOBAL, not per-repo — a MEMORY.md edit in ANY
  // repo satisfies the drift check for a code edit in another.
  let driftText = '';
  try {
    const cfg = loadCfg();
    if (!(cfg && cfg.memoryDriftNudge === false)
        && !fs.existsSync(base + '.memmoved')
        && fs.existsSync(path.join(findGitRoot(process.cwd()), 'MEMORY.md'))) {
      driftText = t.memoryDrift || TRANSLATIONS.en.memoryDrift;
    }
  } catch {}

  // Nothing extant to scan AND no drift → nothing to surface this stop.
  if (!extant.length && !driftText) return;

  // ---- Loud scan report (UNCHANGED) — built only when files still exist on disk ----
  let reason = '';
  if (extant.length) {
    let scan = extant;
    let fileCap = 10;
    let fileCapSlice = 5;
    try {
      const cfg = loadCfg();
      // Clamp at read time to a positive integer — the schema bound (min:1) is enforced
      // only by verify.mjs over the factory config, never at hook read time. Without this,
      // {0} emits an empty-list nudge and {-1}/non-int silently drops the last touched file.
      if (cfg && typeof cfg.autoScanFileCap === 'number') {
        fileCap = Math.max(1, Math.floor(cfg.autoScanFileCap));
      }
      if (cfg && typeof cfg.autoScanFileCapSlice === 'number') {
        fileCapSlice = Math.max(1, Math.floor(cfg.autoScanFileCapSlice));
      }
    } catch {}

    let capNoticeText = '';
    if (scan.length > fileCap) {
      // Sort by mtime (newest first) and slice to protect the token budget —
      // one stat per file, not one per comparison.
      const mtimes = new Map();
      for (const f of scan) { try { mtimes.set(f, fs.statSync(f).mtimeMs); } catch { mtimes.set(f, 0); } }
      scan.sort((a, b) => mtimes.get(b) - mtimes.get(a));
      scan = scan.slice(0, fileCapSlice);
      capNoticeText = (t.capNotice || '').replace('{N}', String(fileCapSlice));
    } else {
      scan.sort();
    }

    let smellText = '';
    try {
      if (fs.existsSync(base + '.smells')) {
        const sm = [...new Set(fs.readFileSync(base + '.smells', 'utf8').split('\n').filter(Boolean))].sort();
        if (sm.length) {
          smellText = t.smellPrefix + sm.map((x) => '  ' + x).join('\n');
        }
      }
    } catch {}

    let skipNoticeText = '';
    if (skippedCount) {
      skipNoticeText = (t.scanExcludeNotice || '').replace('{N}', String(skippedCount));
    }

    const list = scan.map((x) => '  - ' + x).join('\n');
    reason = t.reason(list, smellText) + capNoticeText + skipNoticeText;
  }

  // Acknowledgement marker — store the mtime of .touched when we started the check
  // (so a later stop in this batch re-surfaces neither the scan nor the drift note).
  try {
    // 0o600 for the same reason as the sweep stamp above: this is a flat os.tmpdir() write
    // (no private subdir at all here), so on a shared Unix /tmp the file's own mode is the
    // only thing scoping it to this user. Same CodeQL sink class (#66/#67's rule), caught by
    // the batch sweep rather than by an alert — this site was never reported.
    fs.writeFileSync(scanned, String(touchedMtime), { encoding: 'utf8', mode: 0o600 });
  } catch {}

  // Emit. AG mode (an event-name argv — ONLY the Antigravity template passes one):
  // the current AG engine (re-derived 2026-07-23) documents NO Stop-output inject
  // channel, so emit the explicit no-op `{}` (the side effects above still ran; AG
  // users reach findings via the manual /rot-canary path — CoalMine never blocks on
  // AG). On CC: the scan report rides the loud blocking `reason`; the memory-drift
  // reminder rides `systemMessage` (board #82, 2026-08-08 — a Stop hook returning
  // `hookSpecificOutput.additionalContext` forces the platform into a phantom second
  // turn that DISCARDS a `-p --output-format json` session's `result` field; a plain
  // `systemMessage` string surfaces to the session transcript / an interactive user
  // instead, with no second-turn side effect. Confirmed safe/unaffected: the identical
  // `additionalContext` shape on SessionStart/UserPromptSubmit — coalmine-conductor.js —
  // is a DIFFERENT event and is NOT touched by this fix). A drift-only stop (no extant
  // files) emits the note ALONE, with no decision:block.
  if (process.argv[2]) { process.stdout.write('{}\n'); return; }
  const out = {};
  if (reason) { out.decision = 'block'; out.reason = reason; }
  if (driftText) { out.systemMessage = driftText.trim(); }
  process.stdout.write(JSON.stringify(Object.keys(out).length ? out : {}));
}

try { main(); } catch {}
