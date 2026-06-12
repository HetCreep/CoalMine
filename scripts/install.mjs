#!/usr/bin/env node
// CoalMine installer — copy ALL skills/<name>/ into a target agent's skills dir.
// Performs build-time injection of shared sections from skills/_shared/.
// Generates platform-specific auto-trigger config files (idempotent append).
// Cross-platform (Windows + Unix).
//
// Usage (run from YOUR project root — project targets resolve against cwd):
//   Claude Code users: prefer the plugin (/plugin install coalmine@coalmine) —
//   it serves the same conformed skills and auto-wires hooks. The claude target
//   below is for setups that can't use the plugin.
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
      const sep = existing.trim().length === 0 ? '' : (existing.endsWith('\n') ? '\n' : '\n\n');
      fs.writeFileSync(destFile, existing + sep + tplContent + '\n', 'utf8');
      console.log(`  appended ${path.relative(process.cwd(), destFile)}`);
    }
  } catch (e) {
    console.warn(`  [warn] could not write config ${destFile}: ${e.message}`);
    process.exitCode = 1;
  }
}

function resolveGitDir(repoDir) {
  const gitPath = path.join(repoDir, '.git');
  if (!fs.existsSync(gitPath)) return null;
  const stat = fs.statSync(gitPath);
  if (stat.isDirectory()) return gitPath;
  if (stat.isFile()) {
    try {
      const content = fs.readFileSync(gitPath, 'utf8').trim();
      const match = content.match(/^gitdir:\s*(.+)$/);
      if (match) {
        return path.resolve(repoDir, match[1].trim());
      }
    } catch {}
  }
  return null;
}

// ─── Git Hooks Installation ──────────────────────────────────────────────────
function installGitHooks() {
  try {
    const gitDir = resolveGitDir(process.cwd());
    if (!gitDir) {
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
          if (existing !== hookContent && !existing.includes('# Generated by CoalMine')) {
            const backup = hookPath + '.pre-coalmine';
            if (!fs.existsSync(backup)) {
              fs.copyFileSync(hookPath, backup);
              console.log(`  backed up existing ${hookName} → ${backup}`);
            }
          }
        }
      } catch (err) {
        console.warn(`  [warn] failed to check or create hook backup: ${err.message}`);
      }
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

// ─── Git Hooks Uninstallation ────────────────────────────────────────────────
function uninstallGitHooks() {
  try {
    const gitDir = resolveGitDir(process.cwd());
    if (!gitDir) return;

    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) return;

    const hookNames = ['pre-commit', 'pre-push'];
    for (const hookName of hookNames) {
      const hookPath = path.join(hooksDir, hookName);
      const backupPath = hookPath + '.pre-coalmine';

      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, hookPath);
        fs.unlinkSync(backupPath);
        console.log(`  restored backed-up git hook: ${hookName}`);
      } else if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        if (content.includes('CoalMine')) {
          fs.unlinkSync(hookPath);
          console.log(`  removed git hook: ${hookName}`);
        }
      }
    }
  } catch (e) {
    console.warn(`  [warn] failed to uninstall git hooks: ${e.message}`);
  }
}

// ─── Config Uninstallation ───────────────────────────────────────────────────
function uninstallConfig(arg) {
  try {
    const cfg = PLATFORM_CONFIGS[arg];
    if (!cfg) return;

    const destFile = cfg.dest;
    if (!fs.existsSync(destFile)) return;

    const isHash = cfg.tpl.includes('clinerules');
    const start  = isHash ? CM_START_HASH : CM_START;
    const end    = isHash ? CM_END_HASH   : CM_END;

    let content = fs.readFileSync(destFile, 'utf8');
    const si = content.indexOf(start);
    const ei = content.indexOf(end);

    if (si !== -1 && ei !== -1 && ei > si) {
      const before = content.slice(0, si);
      const after = content.slice(ei + end.length);
      content = (before.trimEnd() + '\n\n' + after.trimStart()).trim();

      if (!content) {
        fs.unlinkSync(destFile);
        console.log(`  removed empty trigger config: ${path.relative(process.cwd(), destFile)}`);
      } else {
        fs.writeFileSync(destFile, content + '\n', 'utf8');
        console.log(`  removed trigger config block from ${path.relative(process.cwd(), destFile)}`);
      }
    }
  } catch (e) {
    console.warn(`  [warn] failed to uninstall config: ${e.message}`);
  }
}

// ─── Skills Uninstallation ───────────────────────────────────────────────────
function uninstallSkills(destDir, skillsList) {
  try {
    if (!fs.existsSync(destDir)) return 0;
    let removed = 0;
    for (const s of skillsList) {
      const targetDir = path.join(destDir, s);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`  removed skill: ${s} from ${targetDir}`);
        removed++;
      }
    }
    return removed;
  } catch (e) {
    console.warn(`  [warn] failed to uninstall skills: ${e.message}`);
    return 0;
  }
}

// ─── Install Manifest (clean version transitions) ────────────────────────────
// Records exactly what CoalMine installed at a target so the next install can
// remove it first — like a package manager's file list. Renamed or removed
// skills can never leave orphan copies behind. Only manifest-listed dirs are
// ever touched; other skills sharing the target dir are never affected.
const MANIFEST_NAME = '.coalmine-manifest.json';

function readManifest(destDir) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(destDir, MANIFEST_NAME), 'utf8'));
    return m && Array.isArray(m.skills) ? m : null;
  } catch { return null; }
}

// Defense against corrupt or hand-edited manifests: every name we are about to
// rm must be a plain directory basename — no separators, no '.'/'..', no
// dotfiles, no absolute/drive paths. Anything else is dropped, never deleted.
function safeSkillNames(names) {
  return names.filter((s) =>
    typeof s === 'string' && s.length > 0 && s === path.basename(s) && !s.startsWith('.')
  );
}

function cleanPreviousInstall(destDir, currentSkills) {
  // Manifest list when present; pre-manifest installs fall back to current
  // skill names (covers same-name upgrades only).
  const previous = readManifest(destDir);
  const names = safeSkillNames(previous ? previous.skills : currentSkills);
  let cleaned = 0;
  for (const s of names) {
    const dir = path.join(destDir, s);
    try {
      if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); cleaned++; }
    } catch (e) {
      console.warn(`  [warn] could not remove previous ${s}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  if (previous) console.log(`  cleaned previous install v${previous.version ?? '?'} (${cleaned} skill dir(s))`);
}

function writeManifest(destDir, installedSkills) {
  try {
    let version = '0.0.0';
    try { version = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin', 'plugin.json'), 'utf8')).version ?? version; } catch {}
    const manifest = { version, installedAt: new Date().toISOString(), skills: installedSkills };
    fs.writeFileSync(path.join(destDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn(`  [warn] could not write install manifest: ${e.message}`);
    process.exitCode = 1;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isUninstall = args.includes('--uninstall') || args.includes('-u');
const targetArg = args.filter(x => x !== '--uninstall' && x !== '-u')[0];

if (!targetArg) {
  console.error(`Usage: node scripts/install.mjs [--uninstall | -u] <${Object.keys(TARGETS).join('|')}|PATH>`);
  process.exit(2);
}
const targetKey = targetArg.toLowerCase();
const dest = TARGETS[targetKey] ?? path.resolve(targetArg);

if (path.resolve(dest) === path.resolve(skillsSrc)) {
  console.error('Target directory cannot be the source skills directory.');
  process.exit(1);
}

if (!fs.existsSync(skillsSrc)) {
  console.error(`No skills/ dir at ${skillsSrc}`);
  process.exit(1);
}

// Get skill dirs (exclude _shared)
let skills = [];
try {
  skills = listSkills(skillsSrc);
} catch (e) {
  console.error(`Error listing skills at ${skillsSrc}: ${e.message}`);
  process.exit(1);
}

if (isUninstall) {
  console.log(`\nUninstalling CoalMine from target: ${targetArg}`);
  // Manifest knows what was actually installed (incl. names from older
  // versions); fall back to current skill names for pre-manifest installs.
  const previous = readManifest(dest);
  const removedCount = uninstallSkills(dest, safeSkillNames(previous ? previous.skills : skills));
  try { fs.rmSync(path.join(dest, MANIFEST_NAME), { force: true }); } catch {}
  uninstallConfig(targetKey);
  uninstallGitHooks();
  console.log(`\nDone: Uninstalled ${removedCount} skill(s) and cleared configs.`);
  process.exit(0);
}

const shared = loadShared();

console.log(`\nInstalling ${skills.length} skill(s) → ${dest}`);
// Program-style version transition: remove everything the previous CoalMine
// install put here (per its manifest), then install the new set fresh.
cleanPreviousInstall(dest, skills);
let n = 0;
const installed = [];
for (const s of skills) {
  try {
    const to = path.join(dest, s);
    installSkillDir(path.join(skillsSrc, s), to, shared);
    console.log(`  installed ${s} → ${to}`);
    installed.push(s);
    n++;
  } catch (e) {
    console.warn(`  [warn] failed to install ${s}: ${e.message}`);
    process.exitCode = 1;
  }
}
writeManifest(dest, installed);

// Generate platform config
console.log(`\nConfiguring auto-trigger for: ${targetArg}`);
const cfg = PLATFORM_CONFIGS[targetKey];
if (cfg) {
  upsertConfig(cfg.dest, cfg.tpl);
} else {
  console.log(`  (no platform config template for "${targetArg}" — skills only)`);
}

// Install git hooks if git is initialized
console.log('\nConfiguring git hooks...');
installGitHooks();

// Copy config (.coalmine.json) to project root if not already present
console.log('\nConfiguring settings...');
try {
  const configDest = path.join(process.cwd(), '.coalmine.json');
  if (!fs.existsSync(configDest)) {
    fs.copyFileSync(
      path.join(repo, 'platform-configs', '.coalmine.json'),
      configDest
    );
    console.log(`  created default settings → ${configDest}`);
  } else {
    console.log(`  settings file already exists at ${configDest}`);
  }
} catch (err) {
  console.warn(`  [warn] failed to copy settings: ${err.message}`);
}

const failed = skills.length - n;
console.log(`\nDone: ${n}/${skills.length} skill(s) → ${dest}${failed ? ` (${failed} failed)` : ''}`);
console.log(`Verify: node scripts/verify.mjs`);

