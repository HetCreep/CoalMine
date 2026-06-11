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
//   node scripts/install.mjs codex         → ./.agents/skills/        (project, cwd)
//   node scripts/install.mjs <PATH>        → <PATH>/                  (any dir)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadShared as loadSharedFrom, listSkills, installSkillDir } from './lib/render.mjs';
import { TARGETS } from './lib/targets.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsSrc = path.join(repo, 'skills');
const sharedDir = path.join(skillsSrc, '_shared');
const platformDir = path.join(repo, 'platform-configs');

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
      // Update existing CoalMine section — splice in only the marker-delimited
      // block, so template content outside the markers (e.g. cursor.mdc YAML
      // frontmatter) is not duplicated on every re-run.
      const ts = tplContent.indexOf(start);
      const te = tplContent.indexOf(end);
      const block = ts !== -1 && te !== -1 && te > ts ? tplContent.slice(ts, te + end.length) : tplContent;
      existing = existing.slice(0, si) + block + existing.slice(ei + end.length);
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
    process.exitCode = 1;
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

    // Single source of truth: install the repo's hook scripts verbatim so the
    // .git/hooks copies can never drift from hooks/pre-commit.sh / pre-push.sh.
    const hooks = {
      'pre-commit': fs.readFileSync(path.join(repo, 'hooks', 'pre-commit.sh'), 'utf8'),
      'pre-push': fs.readFileSync(path.join(repo, 'hooks', 'pre-push.sh'), 'utf8'),
    };

    for (const [hookName, hookContent] of Object.entries(hooks)) {
      const hookPath = path.join(hooksDir, hookName);
      // Back up a pre-existing hook that isn't ours (once) instead of clobbering it.
      try {
        if (fs.existsSync(hookPath)) {
          const existing = fs.readFileSync(hookPath, 'utf8');
          if (existing !== hookContent && !existing.includes('CoalMine')) {
            const backup = hookPath + '.pre-coalmine';
            if (!fs.existsSync(backup)) {
              fs.copyFileSync(hookPath, backup);
              console.log(`  backed up existing ${hookName} → ${backup}`);
            }
          }
        }
      } catch {}
      fs.writeFileSync(hookPath, hookContent);
      // mode option only applies on file creation — set it explicitly so an
      // overwritten hook is executable on Unix too.
      try { fs.chmodSync(hookPath, 0o755); } catch {}
      console.log(`  installed git hook: ${hookName} → ${hookPath}`);
    }
  } catch (e) {
    console.warn(`  [warn] failed to install git hooks: ${e.message}`);
    process.exitCode = 1;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
const arg = process.argv[2];
if (!arg) {
  console.error(`Usage: node scripts/install.mjs <${Object.keys(TARGETS).join('|')}|PATH>`);
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
    process.exitCode = 1;
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

const failed = skills.length - n;
console.log(`\nDone: ${n}/${skills.length} skill(s) → ${dest}${failed ? ` (${failed} failed)` : ''}`);
console.log(`Verify: node scripts/verify.mjs`);
