#!/usr/bin/env node
// Code-Health Tier 2 (Stop) — cross-platform (Node).
// At a natural stop, if code was edited this session, ask the agent to run the rot-canary
// skill at DEPTH=QUICK on the touched files. Loop-guarded (stop_hook_active), one-shot per
// edit-batch, kill-switchable via ~/.claude/.rot-canary-off.
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
const SAFER_ENUM = { updateMode: ['off', 'remind', 'ask', 'auto'] }; // index 0 = safest
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
    const marker = path.join(tmp, 'rot-canary-sweep.marker');
    try {
      if (Date.now() - fs.statSync(marker).mtimeMs < 24 * 60 * 60 * 1000) return;
    } catch {} // no marker yet → sweep now
    try { fs.writeFileSync(marker, ''); } catch {}
    const staleDays = getTempSweepStaleDays();
    const cutoff = Date.now() - (staleDays * 24 * 60 * 60 * 1000);
    for (const f of fs.readdirSync(tmp)) {
      if (f === 'rot-canary-sweep.marker') continue; // the throttle gate itself
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
    const markerDir = path.join(tmp, 'coalmine');
    let markerFiles = [];
    try { markerFiles = fs.readdirSync(markerDir); } catch {} // absent on a CC-only / no-AG box
    for (const f of markerFiles) {
      if (!f.endsWith('.marker')) continue;
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
  // (default ON). At emit the note rides the QUIET model-only additionalContext channel,
  // decoupled from the scan report; a drift-only stop surfaces it alone (no block).
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
    fs.writeFileSync(scanned, String(touchedMtime), 'utf8');
  } catch {}

  // Emit. AG mode (an event-name argv — ONLY the Antigravity template passes one):
  // the current AG engine (re-derived 2026-07-23) documents NO Stop-output inject
  // channel, so emit the explicit no-op `{}` (the side effects above still ran; AG
  // users reach findings via the manual /rot-canary path — CoalMine never blocks on
  // AG). On CC: the scan report rides the loud blocking `reason`; the memory-drift
  // reminder rides the QUIET model-only hookSpecificOutput.additionalContext (a field
  // in the same sanctioned Stop JSON block, never the loud block, never a fix menu). A
  // drift-only stop (no extant files) emits the quiet note ALONE, with no decision:block.
  if (process.argv[2]) { process.stdout.write('{}\n'); return; }
  const out = {};
  if (reason) { out.decision = 'block'; out.reason = reason; }
  if (driftText) { out.hookSpecificOutput = { hookEventName: 'Stop', additionalContext: driftText.trim() }; }
  process.stdout.write(JSON.stringify(Object.keys(out).length ? out : {}));
}

try { main(); } catch {}
