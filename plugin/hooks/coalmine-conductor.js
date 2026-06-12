#!/usr/bin/env node
// CoalMine conductor (SessionStart) — injects the always-on offer rules so the
// suite drives itself: the user remembers no commands, the agent offers the
// right canary at the right moment, and every costly action asks first.
// Plain stdout becomes session context. Fail-silent, no network, ~0ms.
const fs = require('fs');
const path = require('path');

const CONDUCTOR = [
  '[CoalMine] 9 quality canaries installed. Conduct them (answer in the USER\'S language; offer via your question tool; never auto-run costly work without a chosen option):',
  '- rot-canary: hooks auto-scan touched files at session end (QUICK, capped via autoScanFileCap; offer the fix menu if a user is present). DEEP whole-repo scan only on request.',
  '- gold-standard (important): no "coalmine: verified" stamp in .claude/rules/, .agents/rules/, or AGENTS.md → offer /gold-standard ONCE this session (Run now / Queue / Skip; respect Skip). Re-offer when a stamp is past its revalidate date.',
  '- Specialists — offer on domain entry (never auto-run): deps/packages → supply-chain-audit · schema/contract/serialization → drift-canary · async/retry/failure paths → resilience-audit · hot loops/queries/caches → scale-canary · tests/coupling/DI → testability-canary · logging/metrics/tracing → telemetry-canary · version-sensitive facts → source-grounding.',
  '- Honor every .coalmine.json override if present (the installed commented file documents all keys).',
  '- Self error-report: if a CoalMine component misbehaves, OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a user-reviewed summary — never auto-submit.',
].join('\n');

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
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    _cfg = JSON.parse(cleanJson);
  } catch {}
  return _cfg;
}
// </coalmine-shared: node-config>

function main() {
  try {
    const cfg = loadCfg();
    if (cfg && (cfg.enableConductor === false || cfg.conductor === false)) return; // legacy key honored
    const disabled = cfg && (cfg.disabledCanaries !== undefined ? cfg.disabledCanaries : cfg.disable); // legacy key honored
    if (Array.isArray(disabled) && (disabled.includes('conductor') || disabled.includes('all'))) return;
  } catch {}
  process.stdout.write(CONDUCTOR);
}

try { main(); } catch {}
