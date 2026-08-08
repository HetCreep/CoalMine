// Per-project .coalmine.json config-path resolution — shared by every CLI
// script that reads or writes the project config (configure.mjs, install.mjs).
// Hooks carry their OWN copy of this same logic in hooks/_shared/node-config.js
// (Phoenix #9: hooks stay copy-one-file portable, they cannot import a
// scripts/lib module) — keep the two in sync by hand if the read order itself
// ever changes.
import fs from 'fs';
import path from 'path';

export const AGENT_DIR_ORDER = ['.claude', '.agents', '.gemini'];

// Namespace campaign (#69+#39, owner-designated 2026-08-08). Per-project
// config lives under an agent dir, never bare at the project root any more.
// THE READ ORDER IS A RAIL — identical wording in every room's readCfg
// comment and README Configure section, one flock:
//   1. <project>/.<the running agent's OWN dir>/coal/coalmine.json — the dir
//      of the agent actually executing. CoalMine activates ONLY through
//      Claude Code's own hook system; it has no other running-agent identity
//      to branch on, so "own dir" is always `.claude` and collapses onto the
//      first entry of step 2 below rather than needing a separate check.
//   2. Other known agent dirs, fixed order: `.claude` -> `.agents` ->
//      `.gemini` (first FOUND wins).
//   3. LEGACY: <project>/.coalmine.json at the project root (the
//      pre-2026-08-08 shape) — read normally, no breakage for an existing user.
// WRITE target = where the config was found; absent everywhere, the running
// agent's own dir (.claude/coal/coalmine.json).
export function projectConfigCandidates(root) {
  const candidates = AGENT_DIR_ORDER.map((d) => path.join(root, d, 'coal', 'coalmine.json'));
  candidates.push(path.join(root, '.coalmine.json')); // LEGACY, always last
  return candidates;
}

export function projectConfigPath(root) {
  const candidates = projectConfigCandidates(root);
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return candidates[0]; // nothing found anywhere -- own-dir is both the read and write target
}
