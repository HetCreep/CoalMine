#!/usr/bin/env node
// CoalMine installer — copy ALL skills/<name>/ into a target agent's skills dir. Cross-platform.
//
// Usage:
//   node scripts/install.mjs claude        → ~/.claude/skills/        (global)
//   node scripts/install.mjs antigravity   → ./.agents/skills/        (project, cwd)
//   node scripts/install.mjs copilot       → ./.github/skills/        (project, cwd)
//   node scripts/install.mjs codex         → ~/.codex/skills/         (global)
//   node scripts/install.mjs <PATH>        → <PATH>/                  (any dir)
//
// (Claude Code's preferred path is the plugin: `/plugin install coalmine@coalmine`.
//  This script is for the other SKILL.md-native agents.)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsSrc = path.join(repo, 'skills');

const TARGETS = {
  claude:      path.join(os.homedir(), '.claude', 'skills'),
  antigravity: path.join(process.cwd(), '.agents', 'skills'),
  copilot:     path.join(process.cwd(), '.github', 'skills'),
  codex:       path.join(os.homedir(), '.codex', 'skills'),
};

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/install.mjs <claude|antigravity|copilot|codex|PATH>');
  process.exit(2);
}
const dest = TARGETS[arg] ?? path.resolve(arg);

if (!fs.existsSync(skillsSrc)) {
  console.error(`No skills/ dir at ${skillsSrc}`);
  process.exit(1);
}
const skills = fs.readdirSync(skillsSrc, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let n = 0;
for (const s of skills) {
  const from = path.join(skillsSrc, s);
  const to = path.join(dest, s);
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });   // copies SKILL.md + any extras
  console.log(`  installed ${s} -> ${to}`);
  n++;
}
console.log(`\nDone: ${n} skill(s) -> ${dest}`);
console.log(`Verify: node scripts/verify.mjs ${arg}`);
