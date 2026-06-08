#!/usr/bin/env node
// CoalMine verify — check repo integrity (skills, manifests, hooks) and, optionally, an install target.
// Cross-platform. Exit 0 = PASS, 1 = FAIL.
//
// Usage:
//   node scripts/verify.mjs                 → verify the repo
//   node scripts/verify.mjs <agent|PATH>    → also verify skills landed at that target

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = true;
const pass = (m) => console.log('  ok   ' + m);
const fail = (m) => { ok = false; console.log('  FAIL ' + m); };

// 1. skills
const skillsSrc = path.join(repo, 'skills');
const skills = fs.existsSync(skillsSrc)
  ? fs.readdirSync(skillsSrc, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name)
  : [];
console.log(`skills (${skills.length} found):`);
for (const s of skills) {
  const md = path.join(skillsSrc, s, 'SKILL.md');
  if (!fs.existsSync(md)) { fail(`${s}: SKILL.md missing`); continue; }
  const head = fs.readFileSync(md, 'utf8').slice(0, 600);
  if (!/^---/.test(head)) fail(`${s}: no YAML frontmatter`);
  else if (!/\bname:\s*\S/.test(head)) fail(`${s}: frontmatter 'name:' missing`);
  else if (!/\bdescription:\s*\S/.test(head)) fail(`${s}: frontmatter 'description:' missing`);
  else pass(`${s}`);
}
if (skills.length !== 9) fail(`expected 9 skills, found ${skills.length}`);

// 2. manifests (valid JSON)
console.log('manifests:');
for (const m of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'hooks/hooks.json']) {
  const p = path.join(repo, m);
  if (!fs.existsSync(p)) { fail(`${m} missing`); continue; }
  try { JSON.parse(fs.readFileSync(p, 'utf8')); pass(m); } catch (e) { fail(`${m} invalid JSON: ${e.message}`); }
}

// 3. hooks present
console.log('hooks:');
for (const h of ['hooks/rotcanary-touch.js', 'hooks/rotcanary-stop.js']) {
  fs.existsSync(path.join(repo, h)) ? pass(h) : fail(`${h} missing`);
}

// 4. optional install target
const arg = process.argv[2];
if (arg) {
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
  const dest = TARGETS[arg] ?? path.resolve(arg);
  console.log(`target ${dest}:`);
  for (const s of skills) {
    const targetMd = path.join(dest, s, 'SKILL.md');
    if (!fs.existsSync(targetMd)) {
      fail(`${s} NOT at target`);
      continue;
    }
    const content = fs.readFileSync(targetMd, 'utf8');
    if (content.includes('<!-- SHARED:')) {
      fail(`${s} at target contains unresolved template markers!`);
    } else {
      pass(`${s} installed and conformed`);
    }
  }
}

console.log(ok ? '\nVERIFY: PASS' : '\nVERIFY: FAIL');
process.exit(ok ? 0 : 1);
