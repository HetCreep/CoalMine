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

// Heuristic user-language detection: env locale first, then regional characters
// in project docs (per hooks-safety.md section 5).
function detectLang() {
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    const cfg = JSON.parse(cleanJson);
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

    const cwd = process.cwd();
    for (const file of ['README.md', 'MEMORY.md', 'AGENTS.md']) {
      const p = path.join(cwd, file);
      if (fs.existsSync(p)) {
        const content = readFirstChunk(p);
        if (/[\u0e00-\u0e7f]/.test(content)) return 'th';
        if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(content)) {
          if (/[\u3040-\u309f\u30a0-\u30ff]/.test(content)) return 'ja';
          return 'zh';
        }
      }
    }
  } catch {}
  return 'en';
}

// Phoenix #1 (zero garbage): delete this session's temp state once the batch is
// acknowledged, and sweep rot-canary-* files older than 7 days left behind by
// sessions that never reached a second stop (crash/kill).
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
function cleanupSession(base) {
  for (const f of [base + '.touched', base + '.smells', base + '.scanned']) {
    try { fs.unlinkSync(f); } catch {}
  }
}
function sweepStale() {
  let prob = 0.05;
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    const cfg = JSON.parse(cleanJson);
    if (cfg && typeof cfg.tempSweepProbability === 'number') {
      prob = cfg.tempSweepProbability;
    }
  } catch {}
  if (Math.random() >= prob) return;
  try {
    const tmp = os.tmpdir();
    const cutoff = Date.now() - STALE_MS;
    for (const f of fs.readdirSync(tmp)) {
      if (!f.startsWith('rot-canary-') && !f.startsWith('rotcanary-')) continue; // sweep legacy prefix too
      const p = path.join(tmp, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}

const TRANSLATIONS = {
  en: {
    smellPrefix: '\n\nTripwires flagged at edit time:\n',
    capNotice: '\n\n(Auto-scan capped at 5 files to prevent token leakage; remaining files can be scanned manually)',
    reason: (list, smellText) =>
      'Code-health auto-check (session end): code files were edited this session. Before stopping, ' +
      'invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:\n' +
      list + smellText +
      '\n\nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing ' +
      'material, say so in one line. If findings exist and the user is present, finish by offering the fix menu via your question tool — never fix without a chosen option. (To disable this auto-check: create ~/.claude/.rot-canary-off)',
  },
  th: {
    smellPrefix: '\n\nสัญญาณเตือนความเสี่ยงที่พบขณะแก้ไข:\n',
    capNotice: '\n\n(จำกัดการสแกนอัตโนมัติที่ 5 ไฟล์หลักเพื่อป้องกันโทเค็นรั่วไหล คุณสามารถสั่งสแกนไฟล์ที่เหลือแบบแมนวลได้)',
    reason: (list, smellText) =>
      'ระบบตรวจสอบสุขภาพโค้ดอัตโนมัติ (สิ้นสุดเซสชัน): มีการแก้ไขไฟล์โค้ดในเซสชันนี้ ก่อนที่คุณจะหยุดทำงาน ' +
      'โปรดเรียกใช้สกิล rot-canary ที่ DEPTH=QUICK โดยระบุ SCOPE = ไฟล์ที่แก้ไขเหล่านี้ + ไฟล์ที่เรียกใช้งานโดยตรง:\n' +
      list + smellText +
      '\n\nขั้นตอนการทำงานทั้งหมดระบุไว้ในสกิลแล้ว ให้รายงานเฉพาะข้อมูลที่ยืนยันพบปัญหาแล้วเท่านั้นในรูปแบบตารางความรุนแรง ' +
      'หากพบปัญหาและผู้ใช้อยู่ในเซสชัน ให้จบด้วยการเสนอเมนูตัวเลือกการแก้ไขผ่านเครื่องมือคำถาม — ห้ามแก้ไขโดยไม่มีตัวเลือกที่ถูกเลือก (หากต้องการปิดการตรวจเช็คอัตโนมัตินี้: ให้สร้างไฟล์ ~/.claude/.rot-canary-off)',
  },
  ja: {
    smellPrefix: '\n\n編集時に検出されたリスク警告:\n',
    capNotice: '\n\n(トークン漏洩を防ぐため、自動スキャンは主要5ファイルに制限されています。残りのファイルは手動でスキャンできます)',
    reason: (list, smellText) =>
      'コードヘルス自動チェック（セッション終了）: このセッションでコードファイルが編集されました。終了する前に、' +
      'DEPTH=QUICKでrot-canaryスキルを実行し、SCOPE = これらの編集されたファイル + 直接的呼び出し元を指定してください:\n' +
      list + smellText +
      '\n\nスキルの詳細な手順に従ってください。確認された問題のみを重要度テーブルとして報告し、重要な問題がない場合は1行でその旨を述べてください。' +
      '問題が見つかりユーザーがセッションにいる場合は、質問ツールで修正メニューを提示して締めくくってください — 選択なしに修正してはいけません。（この自動チェックを無効にするには、~/.claude/.rot-canary-offを作成してください）',
  },
  zh: {
    smellPrefix: '\n\n编辑时标记的风险警告：\n',
    capNotice: '\n\n(为防止 Token 泄露，自动扫描限制为前 5 个主要文件；其余文件可手动扫描)',
    reason: (list, smellText) =>
      '代码健康自动检查（会话结束）：此会话中编辑了代码文件。在停止之前，请运行 DEPTH=QUICK 的 rot-canary 技能，' +
      '并将 SCOPE 设置为这些被编辑的文件及其直接调用者：\n' +
      list + smellText +
      '\n\n该技能有完整流程。仅以严重性表格形式报告已确认的问题；如果没有实质问题，请在一行中说明。' +
      '若发现问题且用户在会话中，请以问题工具提供修复选项菜单作为结尾 — 未经选择不得修改代码。（要禁用此自动检查，请创建 ~/.claude/.rot-canary-off）',
  },
  es: {
    smellPrefix: '\n\nAlertas de riesgo marcadas al editar:\n',
    capNotice: '\n\n(Escaneo automático limitado a 5 archivos para evitar fugas de tokens; los archivos restantes se pueden escanear manualmente)',
    reason: (list, smellText) =>
      'Autocomprobación de salud del código (fin de sesión): se editaron archivos de código en esta sesión. Antes de detenerse, ' +
      'invoque la habilidad rot-canary con DEPTH=QUICK y SCOPE = estos archivos modificados + sus llamadores directos:\n' +
      list + smellText +
      '\n\nLa habilidad tiene el procedimiento completo. Informe los hallazgos CONFIRMADOS solo como una tabla de gravedad; si no hay nada relevante, ' +
      'indíquelo en una sola línea. Si hay hallazgos y el usuario está presente, termine ofreciendo el menú de correcciones mediante su herramienta de preguntas — nunca corrija sin una opción elegida. (Para desactivar esta comprobación: cree ~/.claude/.rot-canary-off)',
  },
};

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

// Per-project calibration: .coalmine.json at root may disable this canary or
// override the mode for the project (principle 9 - calibrate, never assume).
function projectOverride() {
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cfg = JSON.parse(content);
    if (cfg && Array.isArray(cfg.disable) && (cfg.disable.includes('rot-canary') || cfg.disable.includes('all'))) return 'off';
    if (cfg && (cfg.mode === 'off' || cfg.mode === 'manual')) return cfg.mode;
  } catch {}
  return null;
}

function main() {
  sweepStale();

  const ov = projectOverride();
  if (ov === 'off' || ov === 'manual') return;
  if (rcMode() !== 'auto') return;

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }
  if (!input || input.stop_hook_active) return;

  const sid = input.session_id;
  if (!sid) return;

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

  const root = findGitRoot(process.cwd());
  let fileCap = 10;
  try {
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cfg = JSON.parse(content);
    if (cfg && typeof cfg.autoScanFileCap === 'number') {
      fileCap = cfg.autoScanFileCap;
    }
  } catch {}

  let capNoticeText = '';
  if (files.length > fileCap) {
    // Sort by mtime (newest first) and slice to top 5 files to protect token budget
    files.sort((a, b) => {
      try { return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs; } catch { return 0; }
    });
    files = files.slice(0, 5);
    capNoticeText = t.capNotice || '';
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

