#!/usr/bin/env node
// CoalMine installer — copy ALL skills/<name>/ into a target agent's skills dir.
// Performs build-time injection of shared sections from skills/_shared/.
// Generates platform-specific auto-trigger config files (idempotent append).
// Cross-platform (Windows + Unix).
//
// Usage:
//   node scripts/install.mjs claude        → ~/.claude/skills/        (global)
//   node scripts/install.mjs antigravity   → ./.agents/skills/        (project, cwd)
//   node scripts/install.mjs copilot       → ./.github/skills/        (project, cwd)
//   node scripts/install.mjs codex         → ~/.codex/skills/         (global)
//   node scripts/install.mjs <PATH>        → <PATH>/                  (any dir)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadShared as loadSharedFrom, listSkills, installSkillDir } from './lib/render.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsSrc = path.join(repo, 'skills');
const sharedDir = path.join(skillsSrc, '_shared');
const platformDir = path.join(repo, 'platform-configs');

// ─── Targets ────────────────────────────────────────────────────────────────
const TARGETS = {
  claude:      path.join(os.homedir(), '.claude', 'skills'),
  antigravity: path.join(process.cwd(), '.agents', 'skills'),
  copilot:     path.join(process.cwd(), '.github', 'skills'),
  codex:       path.join(os.homedir(), '.codex', 'skills'),
  cursor:      path.join(process.cwd(), '.cursor', 'skills'),
  windsurf:    path.join(process.cwd(), '.windsurf', 'skills'),
  cline:       path.join(process.cwd(), '.agents', 'skills'),
  amp:         path.join(process.cwd(), '.agents', 'skills'),
  goose:       path.join(process.cwd(), '.agents', 'skills'),
  junie:       path.join(process.cwd(), '.agents', 'skills'),
  gemini:      path.join(process.cwd(), '.gemini', 'skills'),
  roocode:     path.join(process.cwd(), '.agents', 'skills'),
};

// Platform config output paths (relative to cwd) and their templates
const PLATFORM_CONFIGS = {
  cursor:   { dest: path.join(process.cwd(), '.cursor', 'rules', 'coalmine-trigger.mdc'),        tpl: 'cursor.mdc.template' },
  windsurf: { dest: path.join(process.cwd(), '.windsurf', 'rules', 'coalmine-trigger.md'),       tpl: 'windsurf.md.template' },
  cline:    { dest: path.join(process.cwd(), '.clinerules'),                                     tpl: 'clinerules.template' },
  copilot:  { dest: path.join(process.cwd(), '.github', 'copilot-instructions.md'),              tpl: 'copilot-instructions.template' },
  antigravity: { dest: path.join(process.cwd(), '.agents', 'rules', 'coalmine-trigger.md'),     tpl: 'windsurf.md.template' },
  amp:      { dest: path.join(process.cwd(), '.agents', 'rules', 'coalmine-trigger.md'),        tpl: 'windsurf.md.template' },
  goose:    { dest: path.join(process.cwd(), '.agents', 'rules', 'coalmine-trigger.md'),        tpl: 'windsurf.md.template' },
  junie:    { dest: path.join(process.cwd(), '.agents', 'rules', 'coalmine-trigger.md'),        tpl: 'windsurf.md.template' },
  roocode:  { dest: path.join(process.cwd(), '.agents', 'rules', 'coalmine-trigger.md'),        tpl: 'windsurf.md.template' },
  gemini:   { dest: path.join(process.cwd(), '.gemini', 'rules', 'coalmine-trigger.md'),        tpl: 'windsurf.md.template' },
};

// ─── Load shared sections (render core lives in lib/render.mjs) ────────────
function loadShared() {
  try {
    return loadSharedFrom(sharedDir);
  } catch (e) {
    console.error(`Failed to load shared sections: ${e.message}`);
    process.exit(1);
  }
}

// ─── Idempotent append of platform config ──────────────────────────────────
const CM_START = '<!-- COALMINE:START -->';
const CM_END   = '<!-- COALMINE:END -->';
// For clinerules (# style comments):
const CM_START_HASH = '# COALMINE:START';
const CM_END_HASH   = '# COALMINE:END';

function upsertConfig(destFile, tplFile) {
  try {
    const tplPath = path.join(platformDir, tplFile);
    if (!fs.existsSync(tplPath)) { console.warn(`  [warn] template not found: ${tplFile}`); return; }
    const tplContent = fs.readFileSync(tplPath, 'utf8').trim();

    const isHash = tplFile.includes('clinerules');
    const start  = isHash ? CM_START_HASH : CM_START;
    const end    = isHash ? CM_END_HASH   : CM_END;

    fs.mkdirSync(path.dirname(destFile), { recursive: true });

    if (!fs.existsSync(destFile)) {
      // New file
      fs.writeFileSync(destFile, tplContent + '\n', 'utf8');
      console.log(`  created ${path.relative(process.cwd(), destFile)}`);
      return;
    }

    let existing = fs.readFileSync(destFile, 'utf8');
    const si = existing.indexOf(start);
    const ei = existing.indexOf(end);

    if (si !== -1 && ei !== -1 && ei > si) {
      // Update existing CoalMine section
      existing = existing.slice(0, si) + tplContent + existing.slice(ei + end.length);
      fs.writeFileSync(destFile, existing, 'utf8');
      console.log(`  updated ${path.relative(process.cwd(), destFile)}`);
    } else {
      // Append new CoalMine section
      const sep = existing.endsWith('\n') ? '\n' : '\n\n';
      fs.writeFileSync(destFile, existing + sep + tplContent + '\n', 'utf8');
      console.log(`  appended ${path.relative(process.cwd(), destFile)}`);
    }
  } catch (e) {
    console.warn(`  [warn] could not write config ${destFile}: ${e.message}`);
  }
}

// ─── Git Hooks Installation ──────────────────────────────────────────────────
function installGitHooks() {
  try {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      console.log('\nGit repository not detected at current directory — skipping git hooks installation.');
      return;
    }

    const hooksDir = path.join(gitDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });

    const hooks = {
      'pre-commit': '#!/bin/sh\n# CoalMine pre-commit hook\nif [ -f scripts/verify.mjs ]; then\n  node scripts/verify.mjs\n  exit $?\nfi\nexit 0\n',
      'pre-push': '#!/bin/sh\n# CoalMine pre-push hook\nif [ -f scripts/verify.mjs ]; then\n  node scripts/verify.mjs\n  exit $?\nfi\nexit 0\n'
    };

    for (const [hookName, hookContent] of Object.entries(hooks)) {
      const hookPath = path.join(hooksDir, hookName);
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log(`  installed git hook: ${hookName} → ${hookPath}`);
    }
  } catch (e) {
    console.warn(`  [warn] failed to install git hooks: ${e.message}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/install.mjs <claude|antigravity|copilot|codex|cursor|windsurf|cline|amp|goose|junie|gemini|roocode|PATH>');
  process.exit(2);
}
const dest = TARGETS[arg] ?? path.resolve(arg);

if (!fs.existsSync(skillsSrc)) {
  console.error(`No skills/ dir at ${skillsSrc}`);
  process.exit(1);
}

const shared = loadShared();

// Get skill dirs (exclude _shared)
const skills = listSkills(skillsSrc);

console.log(`\nInstalling ${skills.length} skill(s) → ${dest}`);
let n = 0;
for (const s of skills) {
  try {
    const to = path.join(dest, s);
    installSkillDir(path.join(skillsSrc, s), to, shared);
    console.log(`  installed ${s} → ${to}`);
    n++;
  } catch (e) {
    console.warn(`  [warn] failed to install ${s}: ${e.message}`);
  }
}

// Generate platform config
console.log(`\nConfiguring auto-trigger for: ${arg}`);
const cfg = PLATFORM_CONFIGS[arg];
if (cfg) {
  upsertConfig(cfg.dest, cfg.tpl);
} else {
  console.log(`  (no platform config template for "${arg}" — skills only)`);
}

// Install git hooks if git is initialized
console.log('\nConfiguring git hooks...');
installGitHooks();

console.log(`\nDone: ${n} skill(s) → ${dest}`);
console.log(`Verify: node scripts/verify.mjs`);
