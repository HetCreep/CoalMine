#!/usr/bin/env node
// CoalMine conductor (SessionStart) — injects the always-on offer rules so the
// suite drives itself: the user remembers no commands, the agent offers the
// right canary at the right moment, and every costly action asks first.
// Plain stdout becomes session context. Fail-silent, no network, ~0ms.
const fs = require('fs');
const path = require('path');

const CONDUCTOR = [
  '[CoalMine] 9 quality canaries are installed. Conduct them for the user (answer in the USER\'S language; offer via your question tool; never auto-run anything costly without a chosen option):',
  '- rot-canary: auto-scans touched files at session end via hooks (QUICK, then offer the fix menu if a user is present). Offer a DEEP whole-repo scan only when the user asks for a full check.',
  '- gold-standard (important): if this project has NO CoalMine-stamped rules yet (no "coalmine: verified" stamp in .claude/rules/, .agents/rules/, or AGENTS.md), offer /gold-standard ONCE this session (Run now / Queue / Skip) — it sets the project\'s golden rules. Also offer it when any stamp\'s revalidate date is past due. Respect a Skip for the rest of the session.',
  '- Specialists — offer (never auto-run) the moment the conversation enters their domain: deps/packages → supply-chain-audit · DB schema/API contract/serialization → drift-canary · async/retry/failure paths → resilience-audit · hot loops/queries/caches → scale-canary · tests/coupling/DI → testability-canary · logging/metrics/tracing → telemetry-canary · version-sensitive facts → source-grounding.',
  '- Per-project config: honor .coalmine.json (disable list, defaultTier, language) if present.',
].join('\n');

function main() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.coalmine.json'), 'utf8'));
    if (cfg && cfg.conductor === false) return;
    if (cfg && Array.isArray(cfg.disable) && cfg.disable.includes('conductor')) return;
  } catch {}
  process.stdout.write(CONDUCTOR);
}

try { main(); } catch {}
