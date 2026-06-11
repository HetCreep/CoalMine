// CoalMine agent install targets — the single source of truth for the
// agent → skills-dir map. Shared by install.mjs and verify.mjs so the two
// can never drift. Node built-ins only.

import os from 'node:os';
import path from 'node:path';

// Paths verified against vendor docs (Jun 2026):
//   codex → $CWD/.agents/skills per developers.openai.com/codex/skills.md
//   (NOT ~/.codex/skills); junie → .junie/skills per junie.jetbrains.com/docs/agent-skills.html.
export const TARGETS = {
  claude:      path.join(os.homedir(), '.claude', 'skills'),
  antigravity: path.join(process.cwd(), '.agents', 'skills'),
  copilot:     path.join(process.cwd(), '.github', 'skills'),
  codex:       path.join(process.cwd(), '.agents', 'skills'),
  cursor:      path.join(process.cwd(), '.cursor', 'skills'),
  windsurf:    path.join(process.cwd(), '.windsurf', 'skills'),
  cline:       path.join(process.cwd(), '.agents', 'skills'),
  amp:         path.join(process.cwd(), '.agents', 'skills'),
  goose:       path.join(process.cwd(), '.agents', 'skills'),
  junie:       path.join(process.cwd(), '.junie', 'skills'),
  gemini:      path.join(process.cwd(), '.gemini', 'skills'),
  roocode:     path.join(process.cwd(), '.agents', 'skills'),
};
