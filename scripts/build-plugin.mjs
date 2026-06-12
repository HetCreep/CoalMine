#!/usr/bin/env node
// CoalMine plugin-dist builder — regenerates the committed plugin/ directory
// that .claude-plugin/marketplace.json serves (plugins[0].source = "./plugin").
//
// Why a committed dist: the Claude Code plugin marketplace serves files
// straight from git, with no build step — so the conformed copies (shared
// sections injected) must live in the repo. Raw skills/ templates stay the
// authoring source; plugin/ is generated output. Never hand-edit plugin/.
//
// Re-run after editing skills/, skills/_shared/, hooks/, or
// .claude-plugin/plugin.json:
//   node scripts/build-plugin.mjs
// verify.mjs FAILs (and the pre-commit hook blocks) while plugin/ is stale.
// Cross-platform, Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadShared, listSkills, installSkillDir } from './lib/render.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsSrc = path.join(repo, 'skills');
const pluginDir = path.join(repo, 'plugin');

let shared;
try {
  shared = loadShared(path.join(skillsSrc, '_shared'));
} catch (e) {
  console.error(`Failed to load shared sections: ${e.message}`);
  process.exit(1);
}

// Deterministic rebuild: wipe, then regenerate everything.
fs.rmSync(pluginDir, { recursive: true, force: true });

const skills = listSkills(skillsSrc);
console.log(`\nBuilding plugin dist (${skills.length} skills) → ${pluginDir}`);
let n = 0;
for (const s of skills) {
  try {
    installSkillDir(path.join(skillsSrc, s), path.join(pluginDir, 'skills', s), shared);
    console.log(`  rendered ${s}`);
    n++;
  } catch (e) {
    console.error(`  [fail] ${s}: ${e.message}`);
    process.exitCode = 1;
  }
}

// Hooks — hooks.json references ${CLAUDE_PLUGIN_ROOT}/hooks/*.js, which
// resolves inside the dist once it is the plugin root.
fs.mkdirSync(path.join(pluginDir, 'hooks'), { recursive: true });
for (const f of ['hooks.json', 'rotcanary-touch.js', 'rotcanary-stop.js']) {
  fs.copyFileSync(path.join(repo, 'hooks', f), path.join(pluginDir, 'hooks', f));
}
console.log('  copied hooks/ (hooks.json + rotcanary-touch.js + rotcanary-stop.js)');

// Agents — bundled subagent definitions (Claude Code auto-discovers agents/).
// Recursive copy: same EISDIR class as installSkillDir — never assume flat.
const agentsSrc = path.join(repo, 'agents');
if (fs.existsSync(agentsSrc)) {
  fs.cpSync(agentsSrc, path.join(pluginDir, 'agents'), { recursive: true });
  console.log('  copied agents/');
}

// Plugin manifest — authored once at .claude-plugin/plugin.json, copied in.
fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
fs.copyFileSync(
  path.join(repo, '.claude-plugin', 'plugin.json'),
  path.join(pluginDir, '.claude-plugin', 'plugin.json'),
);
console.log('  copied .claude-plugin/plugin.json');

console.log(`\nDone: ${n}/${skills.length} skill(s) rendered into plugin/`);
console.log('Verify: node scripts/verify.mjs');
