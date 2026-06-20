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
    // Strip // and /* */ comments outside strings. The string alternative consumes
    // an escaped char (\\.) or any non-quote/non-backslash char, so a value ending
    // in \\ terminates the string correctly instead of leaking escape state into the
    // next token (which would mis-strip a later //-containing string \u2192 silent revert).
    const cleanJson = content.replace(/"(?:\\.|[^"\\])*"|\/\/.*|\/\*[\s\S]*?\*\//g, (m) => (m[0] === '"' ? m : ''));
    _cfg = JSON.parse(cleanJson);
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
  for (const f of [base + '.touched', base + '.smells', base + '.scanned']) {
    try { fs.unlinkSync(f); } catch {}
  }
}
function getTempSweepStaleDays() {
  try {
    const cfg = loadCfg();
    if (cfg && typeof cfg.tempSweepStaleDays === 'number') {
      return cfg.tempSweepStaleDays;
    }
  } catch {}
  return 7;
}
function sweepStale() {
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
      if (!f.startsWith('rot-canary-') && !f.startsWith('rotcanary-')) continue; // sweep legacy prefix too
      if (f === 'rot-canary-sweep.marker') continue; // the throttle gate itself
      const p = path.join(tmp, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}

const TRANSLATIONS = {
  en: {
    smellPrefix: '\n\nTripwires flagged at edit time:\n',
    capNotice: '\n\n(Auto-scan capped at {N} files to prevent token leakage; remaining files can be scanned manually)',
    reason: (list, smellText) =>
      'Code-health auto-check (session end): code files were edited this session. Before stopping, ' +
      'invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:\n' +
      list + smellText +
      '\n\nReport CONFIRMED findings only (severity table; one line if none). If findings exist and a user is present, end by offering the fix menu via your question tool — never fix without a chosen option. (Disable: create ~/.claude/.rot-canary-off)',
  },
  th: {
    smellPrefix: '\n\nสัญญาณเตือนความเสี่ยงที่พบขณะแก้ไข:\n',
    capNotice: '\n\n(จำกัดการสแกนอัตโนมัติที่ {N} ไฟล์หลักเพื่อป้องกันโทเค็นรั่วไหล คุณสามารถสั่งสแกนไฟล์ที่เหลือแบบแมนวลได้)',
    reason: (list, smellText) =>
      'ระบบตรวจสอบสุขภาพโค้ดอัตโนมัติ (สิ้นสุดเซสชัน): มีการแก้ไขไฟล์โค้ดในเซสชันนี้ ก่อนที่คุณจะหยุดทำงาน ' +
      'โปรดเรียกใช้สกิล rot-canary ที่ DEPTH=QUICK โดยระบุ SCOPE = ไฟล์ที่แก้ไขเหล่านี้ + ไฟล์ที่เรียกใช้งานโดยตรง:\n' +
      list + smellText +
      '\n\nรายงานเฉพาะปัญหาที่ยืนยันแล้ว (ตารางความรุนแรง; ไม่มีก็สรุปบรรทัดเดียว) หากพบปัญหาและผู้ใช้อยู่ในเซสชัน ให้จบด้วยการเสนอเมนูแก้ไขผ่านเครื่องมือคำถาม — ห้ามแก้โดยไม่มีตัวเลือกที่ถูกเลือก (ปิดระบบนี้: สร้าง ~/.claude/.rot-canary-off)',
  },
  ja: {
    smellPrefix: '\n\n編集時に検出されたリスク警告:\n',
    capNotice: '\n\n(トークン漏洩を防ぐため、自動スキャンは主要{N}ファイルに制限されています。残りのファイルは手動でスキャンできます)',
    reason: (list, smellText) =>
      'コードヘルス自動チェック（セッション終了）: このセッションでコードファイルが編集されました。終了する前に、' +
      'DEPTH=QUICKでrot-canaryスキルを実行し、SCOPE = これらの編集されたファイル + 直接的呼び出し元を指定してください:\n' +
      list + smellText +
      '\n\n確認済みの問題のみ報告（重要度テーブル; なければ1行で）。問題がありユーザーが在席なら、質問ツールで修正メニューを提示して終了 — 選択なしの修正は禁止。（無効化: ~/.claude/.rot-canary-off を作成）',
  },
  zh: {
    smellPrefix: '\n\n编辑时标记的风险警告：\n',
    capNotice: '\n\n(为防止 Token 泄露，自动扫描限制为前 {N} 个主要文件；其余文件可手动扫描)',
    reason: (list, smellText) =>
      '代码健康自动检查（会话结束）：此会话中编辑了代码文件。在停止之前，请运行 DEPTH=QUICK 的 rot-canary 技能，' +
      '并将 SCOPE 设置为这些被编辑的文件及其直接调用者：\n' +
      list + smellText +
      '\n\n仅报告已确认的问题（严重性表格；没有则一行说明）。若有问题且用户在场，最后用问题工具提供修复菜单 — 未经选择不得修改。（停用: 创建 ~/.claude/.rot-canary-off）',
  },
  es: {
    smellPrefix: '\n\nAlertas de riesgo marcadas al editar:\n',
    capNotice: '\n\n(Escaneo automático limitado a {N} archivos para evitar fugas de tokens; los archivos restantes se pueden escanear manualmente)',
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
  // A disabled/non-auto canary does NO work, not even the housekeeping sweep — the
  // sweep runs only on the active (auto) path. Mirrors the PS twin, which already
  // exits before its sweep when disabled/manual/off (Node≡PS parity).
  const ov = projectOverride();
  if (ov === 'off' || ov === 'manual') return;
  if (rcMode() !== 'auto') return;

  sweepStale();

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  // trim() also strips a leading BOM some shells prepend when piping stdin.
  try { input = JSON.parse(raw.trim()); } catch { return; }
  if (!input || input.stop_hook_active) return;

  const sid = input.session_id;
  // Phoenix #10 (sandbox): allowlist the session_id so a traversal-shaped sid cannot
  // escape os.tmpdir() via path.join. Non-conforming -> bail (fail-silent, Phoenix #4).
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
  // Drop lines that aren't real paths (corrupt/garbage .touched content).
  files = files.filter(fs.existsSync);
  if (!files.length) return;

  const lang = detectLang();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  let fileCap = 10;
  let fileCapSlice = 5;
  try {
    const cfg = loadCfg();
    if (cfg && typeof cfg.autoScanFileCap === 'number') {
      fileCap = cfg.autoScanFileCap;
    }
    if (cfg && typeof cfg.autoScanFileCapSlice === 'number') {
      fileCapSlice = cfg.autoScanFileCapSlice;
    }
  } catch {}

  let capNoticeText = '';
  if (files.length > fileCap) {
    // Sort by mtime (newest first) and slice to protect the token budget —
    // one stat per file, not one per comparison.
    const mtimes = new Map();
    for (const f of files) { try { mtimes.set(f, fs.statSync(f).mtimeMs); } catch { mtimes.set(f, 0); } }
    files.sort((a, b) => mtimes.get(b) - mtimes.get(a));
    files = files.slice(0, fileCapSlice);
    capNoticeText = (t.capNotice || '').replace('{N}', String(fileCapSlice));
  } else {
    files.sort();
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

  // Acknowledgement marker — store the mtime of .touched when we started the check.
  try {
    fs.writeFileSync(scanned, String(touchedMtime), 'utf8');
  } catch {}

  const list = files.map((x) => '  - ' + x).join('\n');
  const reason = t.reason(list, smellText) + capNoticeText;

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

try { main(); } catch {}
