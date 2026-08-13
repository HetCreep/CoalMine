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
const SAFER_ENUM = { updateMode: { order: ['off', 'remind', 'ask', 'auto'], default: 'ask' } }; // index 0 = safest; default = config-schema.mjs's declared factory default
// UNION-MERGE KEYS (hooks-safety.md section 9): a strArr key here is QUIETEN-only —
// more entries can only REDUCE what a hook acts on, never escalate spend/consent — so
// the project layer may ADD to the global layer's list, never silently drop an entry
// from it by replacing the whole array. scanExcludePaths is a scan-scope exclude: a
// project adding its own lab-tooling fragment must not erase a global one.
// PRECONDITION for any key added here: its factory default must be the EMPTY array.
// The `!globalCfg || !projectCfg` guard below skips the union computation whenever
// EITHER layer never set the key, falling back to the plain shallow-merge result —
// that fallback is correct only because "layer didn't set it" and "layer set it to
// []" are the same identity element for union. A future UNION key with a NON-empty
// factory default would silently drop those default members whenever only one
// layer sets the key explicitly (the other layer's "unset" is treated as [], not
// as its factory default).
const UNION_ARRAY_KEYS = ['scanExcludePaths'];
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
      // Constrain whenever the PROJECT sets the key — an absent global is its
      // schema default, never "no preference to defend" (board #112). Case-fold
      // both sides before the ordered lookup so a differently-cased project
      // value cannot dodge the clamp (the CW H5 shape).
      for (const [key, { order, default: def }] of Object.entries(SAFER_ENUM)) {
        if (!projectCfg || projectCfg[key] === undefined) continue; // project didn't touch this key
        const globalValue = (globalCfg && globalCfg[key] !== undefined) ? globalCfg[key] : def;
        const gi = order.indexOf(String(globalValue).toLowerCase());
        const pi = order.indexOf(String(projectCfg[key]).toLowerCase());
        if (gi === -1 || pi === -1) continue; // unknown value: leave the shallow-merge result
        merged[key] = pi <= gi ? projectCfg[key] : globalValue; // project may not be LOUDER than the (explicit-or-default) global
      }
      // Same BOTH-layers-explicit guard as SAFER_ENUM above, but the safer direction
      // for an array is UNION (dedup), not "pick one side" — either side may add.
      for (const key of UNION_ARRAY_KEYS) {
        if (!globalCfg || !projectCfg || !Array.isArray(globalCfg[key]) || !Array.isArray(projectCfg[key])) continue;
        merged[key] = [...new Set([...globalCfg[key], ...projectCfg[key]])];
      }
      _cfg = merged;
    }
  } catch {}
  return _cfg;
}
