#!/usr/bin/env node
// Code-Health Tier 2 (Stop) — cross-platform (Node).
// At a natural stop, if code was edited this session, ask the agent to run the rotcanary
// skill at DEPTH=QUICK on the touched files. Loop-guarded (stop_hook_active), one-shot per
// edit-batch, kill-switchable via ~/.claude/.rotcanary-off.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mode: ~/.claude/.rotcanary-mode = auto|manual|off (absent = auto). .rotcanary-off = off (back-compat).
// Only AUTO emits the session-end nudge (manual/off do not).
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
// acknowledged, and sweep rotcanary-* files older than 7 days left behind by
// sessions that never reached a second stop (crash/kill).
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
function cleanupSession(base) {
  for (const f of [base + '.touched', base + '.smells', base + '.scanned']) {
    try { fs.unlinkSync(f); } catch {}
  }
}
function sweepStale() {
  try {
    const tmp = os.tmpdir();
    const cutoff = Date.now() - STALE_MS;
    for (const f of fs.readdirSync(tmp)) {
      if (!f.startsWith('rotcanary-')) continue;
      const p = path.join(tmp, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}

const TRANSLATIONS = {
  en: {
    smellPrefix: '\n\nTripwires flagged at edit time:\n',
    reason: (list, smellText) =>
      'Code-health auto-check (session end): code files were edited this session. Before stopping, ' +
      'invoke the rotcanary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:\n' +
      list + smellText +
      '\n\nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing ' +
      'material, say so in one line. Do not fix unless asked. (To disable this auto-check: create ~/.claude/.rotcanary-off)',
  },
  th: {
    smellPrefix: '\n\nสัญญาณเตือนความเสี่ยงที่พบขณะแก้ไข:\n',
    reason: (list, smellText) =>
      'ระบบตรวจสอบสุขภาพโค้ดอัตโนมัติ (สิ้นสุดเซสชัน): มีการแก้ไขไฟล์โค้ดในเซสชันนี้ ก่อนที่คุณจะหยุดทำงาน ' +
      'โปรดเรียกใช้สกิล rotcanary ที่ DEPTH=QUICK โดยระบุ SCOPE = ไฟล์ที่แก้ไขเหล่านี้ + ไฟล์ที่เรียกใช้งานโดยตรง:\n' +
      list + smellText +
      '\n\nขั้นตอนการทำงานทั้งหมดระบุไว้ในสกิลแล้ว ให้รายงานเฉพาะข้อมูลที่ยืนยันพบปัญหาแล้วเท่านั้นในรูปแบบตารางความรุนแรง ' +
      'และห้ามแก้ไขโค้ดใดๆ หากไม่ได้รับคำสั่งยืนยัน (หากต้องการปิดการตรวจเช็คอัตโนมัตินี้: ให้สร้างไฟล์ ~/.claude/.rotcanary-off)',
  },
  ja: {
    smellPrefix: '\n\n編集時に検出されたリスク警告:\n',
    reason: (list, smellText) =>
      'コードヘルス自動チェック（セッション終了）: このセッションでコードファイルが編集されました。終了する前に、' +
      'DEPTH=QUICKでrotcanaryスキルを実行し、SCOPE = これらの編集されたファイル + 直接の呼び出し元を指定してください:\n' +
      list + smellText +
      '\n\nスキルの詳細な手順に従ってください。確認された問題のみを重要度テーブルとして報告し、重要な問題がない場合は1行でその旨を述べてください。' +
      '指示がない限り、修正は行わないでください。（この自動チェックを無効にするには、~/.claude/.rotcanary-offを作成してください）',
  },
  zh: {
    smellPrefix: '\n\n编辑时标记的风险警告：\n',
    reason: (list, smellText) =>
      '代码健康自动检查（会话结束）：此会话中编辑了代码文件。在停止之前，请运行 DEPTH=QUICK 的 rotcanary 技能，' +
      '并将 SCOPE 设置为这些被编辑的文件及其直接调用者：\n' +
      list + smellText +
      '\n\n该技能有完整流程。仅以严重性表格形式报告已确认的问题；如果没有实质问题，请在一行中说明。' +
      '除非收到要求，否则请勿修改代码。（要禁用此自动检查，请创建 ~/.claude/.rotcanary-off）',
  },
  es: {
    smellPrefix: '\n\nAlertas de riesgo marcadas al editar:\n',
    reason: (list, smellText) =>
      'Autocomprobación de salud del código (fin de sesión): se editaron archivos de código en esta sesión. Antes de detenerse, ' +
      'invoque la habilidad rotcanary con DEPTH=QUICK y SCOPE = estos archivos modificados + sus llamadores directos:\n' +
      list + smellText +
      '\n\nLa habilidad tiene el procedimiento completo. Informe los hallazgos CONFIRMADOS solo como una tabla de gravedad; si no hay nada relevante, ' +
      'indíquelo en una sola línea. No realice correcciones a menos que se le solicite. (Para desactivar esta comprobación: cree ~/.claude/.rotcanary-off)',
  },
};

function main() {
  sweepStale();

  if (rcMode() !== 'auto') return;

  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  if (!raw) return;

  let input;
  try { input = JSON.parse(raw); } catch { return; }
  if (!input || input.stop_hook_active) return;

  const sid = input.session_id;
  if (!sid) return;

  const base = path.join(os.tmpdir(), `rotcanary-${sid}`);
  const touched = base + '.touched';
  if (!fs.existsSync(touched)) return;

  let touchedMtime = 0;
  try { touchedMtime = fs.statSync(touched).mtimeMs; } catch { return; }

  const scanned = base + '.scanned';
  try {
    if (fs.existsSync(scanned)) {
      const content = fs.readFileSync(scanned, 'utf8').trim();
      const lastMtime = content ? Number(content) : Infinity;
      if (touchedMtime <= lastMtime) {
        // Batch already acknowledged on a previous stop — state no longer needed.
        cleanupSession(base);
        return;
      }
    }
  } catch {}

  let files = [];
  try {
    files = [...new Set(fs.readFileSync(touched, 'utf8').split('\n').filter(Boolean).map((x) => path.normalize(x)))].sort();
  } catch { return; }
  // Drop lines that aren't real paths (corrupt/garbage .touched content).
  files = files.filter(fs.existsSync);
  if (!files.length) return;

  const t = TRANSLATIONS[detectLang()] || TRANSLATIONS.en;

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
  const reason = t.reason(list, smellText);

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

try { main(); } catch {}
