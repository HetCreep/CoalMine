#!/usr/bin/env node
// CoalMine verify — check repo integrity (skills, manifests, hooks), the committed
// plugin/ dist (byte-sync vs source, no unresolved markers, no orphans), and,
// optionally, an install target. Cross-platform. Exit 0 = PASS, 1 = FAIL.
//
// Usage:
//   node scripts/verify.mjs                 → verify the repo
//   node scripts/verify.mjs <agent|PATH>    → also verify skills landed at that target

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadShared, renderSkillMd } from './lib/render.mjs';
import { TARGETS } from './lib/targets.mjs';

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
  const src = fs.readFileSync(md, 'utf8');
  const head = src.slice(0, 600);
  if (!/^---/.test(head)) fail(`${s}: no YAML frontmatter`);
  else if (!/\bname:\s*\S/.test(head)) fail(`${s}: frontmatter 'name:' missing`);
  else if (!/\bdescription:\s*\S/.test(head)) fail(`${s}: frontmatter 'description:' missing`);
  else if (!src.includes('<!-- SHARED:')) fail(`${s}: source lost its SHARED template markers (conformed in place? restore the template)`);
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

// 4. plugin dist (committed; served by the marketplace via plugins[].source = "./plugin")
console.log('plugin dist:');
const pluginDir = path.join(repo, 'plugin');
let shared = null;
try { shared = loadShared(path.join(skillsSrc, '_shared')); }
catch (e) { fail(`_shared load failed: ${e.message}`); }
if (!fs.existsSync(pluginDir)) {
  fail('plugin/ missing — run: node scripts/build-plugin.mjs');
} else if (shared) {
  for (const s of skills) {
    const distMd = path.join(pluginDir, 'skills', s, 'SKILL.md');
    if (!fs.existsSync(distMd)) { fail(`plugin/skills/${s} missing — run: node scripts/build-plugin.mjs`); continue; }
    const got = fs.readFileSync(distMd, 'utf8');
    if (got.includes('<!-- SHARED:')) { fail(`plugin/skills/${s} contains unresolved template markers — run: node scripts/build-plugin.mjs`); continue; }
    let want;
    try { want = renderSkillMd(path.join(skillsSrc, s), shared); }
    catch (e) { fail(`plugin/skills/${s} render failed: ${e.message}`); continue; }
    if (got !== want) { fail(`plugin/skills/${s} STALE vs source — run: node scripts/build-plugin.mjs`); continue; }
    pass(`plugin/skills/${s} in sync`);
  }
  // Reverse check: nothing ships from the dist that has no source (orphan guard).
  try {
    const distSkills = fs.readdirSync(path.join(pluginDir, 'skills'), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
    for (const d of distSkills) {
      if (!skills.includes(d)) fail(`plugin/skills/${d} has no source — run: node scripts/build-plugin.mjs`);
    }
  } catch (e) { fail(`plugin/skills unreadable: ${e.message}`); }
  for (const f of ['hooks/hooks.json', 'hooks/rotcanary-touch.js', 'hooks/rotcanary-stop.js', '.claude-plugin/plugin.json']) {
    const distFile = path.join(pluginDir, f);
    if (!fs.existsSync(distFile)) { fail(`plugin/${f} missing — run: node scripts/build-plugin.mjs`); continue; }
    if (fs.readFileSync(path.join(repo, f), 'utf8') !== fs.readFileSync(distFile, 'utf8')) {
      fail(`plugin/${f} STALE vs ${f} — run: node scripts/build-plugin.mjs`);
    } else pass(`plugin/${f} in sync`);
  }
  try {
    const mkt = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin', 'marketplace.json'), 'utf8'));
    const srcField = mkt.plugins?.[0]?.source;
    if (srcField === './plugin') pass('marketplace serves ./plugin (conformed dist)');
    else fail(`marketplace plugins[0].source is ${JSON.stringify(srcField)} — must be "./plugin" so installs get conformed skills`);
  } catch { /* manifest parse already checked above */ }
}

// 5. optional install target
const arg = process.argv[2];
if (arg) {
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
