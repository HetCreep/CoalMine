#!/usr/bin/env node
// CoalMine conductor (SessionStart) — injects the always-on offer rules so the
// suite drives itself: the user remembers no commands, the agent offers the
// right canary at the right moment, and every costly action asks first.
// Plain stdout becomes session context. Fail-silent, no network, ~0ms.
const fs = require('fs');
const path = require('path');

const CONDUCTOR = [
  '[CoalMine] 9 quality canaries are installed. Conduct them for the user (answer in the USER\'S language; offer via your question tool; never auto-run anything costly without a chosen option):',
  '- rot-canary: auto-scans touched files at session end via hooks (QUICK, then offer the fix menu if a user is present). Capped automatically at 10 files (configurable via "autoScanFileCap" in .coalmine.json) to prevent token bloat; Agent should dynamically filter and scan only core logic files for large edits.',
  '- gold-standard (important): if this project has NO CoalMine-stamped rules yet (no "coalmine: verified" stamp in .claude/rules/, .agents/rules/, or AGENTS.md), offer /gold-standard ONCE this session (Run now / Queue / Skip) — it sets the project\'s golden rules. Also offer it when any stamp\'s revalidate date is past due. Respect a Skip for the rest of the session.',
  '- Specialists — offer (never auto-run) the moment the conversation enters their domain: deps/packages → supply-chain-audit · DB schema/API contract/serialization → drift-canary · async/retry/failure paths → resilience-audit · hot loops/queries/caches → scale-canary · tests/coupling/DI → testability-canary · logging/metrics/tracing → telemetry-canary · version-sensitive facts → source-grounding.',
  '- skill-update: if the installed skills (.coalmine-manifest.json) are older than 30 days, or if you discover a newer version tag in the origin remote, OFFER (via the question tool) to create a branch feature/update-coalmine-skills, fetch conformed skills from the official stable release, commit, and submit a PR. Never auto-update.',
  '- Per-project config: honor .coalmine.json (disabledCanaries, defaultTier, language, autoScanFileCap, branchPrefix, pullRequestRemote, autoFixMode, skipOnboarding, ruleRevalidateDays) if present.',
  '- Self error-report: if a CoalMine component itself misbehaves (wrong finding, hook error, skill contradiction), OFFER to file it — open https://github.com/HetCreep/CoalMine/issues/new/choose with a short summary the user has reviewed. Never auto-submit; never include code or paths the user has not approved.',
].join('\n');

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

function main() {
  try {
    const root = findGitRoot(process.cwd());
    const content = fs.readFileSync(path.join(root, '.coalmine.json'), 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    const cfg = JSON.parse(cleanJson);
    if (cfg && cfg.enableConductor === false) return;
    if (cfg && Array.isArray(cfg.disabledCanaries) && (cfg.disabledCanaries.includes('conductor') || cfg.disabledCanaries.includes('all'))) return;
  } catch {}
  process.stdout.write(CONDUCTOR);
}

try { main(); } catch {}

