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
import { loadShared, renderSkillMd, listSkills } from './lib/render.mjs';
import { TARGETS } from './lib/targets.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = true;
const pass = (m) => console.log('  ok   ' + m);
const fail = (m) => { ok = false; console.log('  FAIL ' + m); };

// 1. skills
const skillsSrc = path.join(repo, 'skills');
let skills = [];
try {
  skills = fs.existsSync(skillsSrc) ? listSkills(skillsSrc) : [];
} catch (e) {
  fail(`failed to list skills at ${skillsSrc}: ${e.message}`);
}
console.log(`skills (${skills.length} found):`);
for (const s of skills) {
  const md = path.join(skillsSrc, s, 'SKILL.md');
  if (!fs.existsSync(md)) { fail(`${s}: SKILL.md missing`); continue; }
  let src;
  try { src = fs.readFileSync(md, 'utf8'); }
  catch (e) { fail(`${s}: SKILL.md unreadable: ${e.message}`); continue; }

  // Extract YAML frontmatter (between the first two "---" delimiters)
  const parts = src.split('---');
  if (parts.length < 3 || src.trim().indexOf('---') !== 0) {
    fail(`${s}: no YAML frontmatter`);
  } else {
    const head = parts[1];
    if (!/\bname:\s*\S/.test(head)) fail(`${s}: frontmatter 'name:' missing`);
    else if (!/\bdescription:\s*\S/.test(head)) fail(`${s}: frontmatter 'description:' missing`);
    else if (!src.includes('<!-- SHARED:')) fail(`${s}: source lost its SHARED template markers (conformed in place? restore the template)`);
    else pass(`${s}`);
  }
}
if (skills.length !== 9) fail(`expected 9 skills, found ${skills.length}`);

// 2. manifests (valid JSON)
console.log('manifests:');
for (const m of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'hooks/hooks.json']) {
  const p = path.join(repo, m);
  if (!fs.existsSync(p)) { fail(`${m} missing`); continue; }
  try { JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); pass(m); } catch (e) { fail(`${m} invalid JSON: ${e.message}`); }
}

// 2.5 config (if present)
const configPath = path.join(repo, '.coalmine.json');
if (fs.existsSync(configPath)) {
  console.log('config (.coalmine.json):');
  try {
    const content = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    const cfg = JSON.parse(cleanJson);
    const validKeys = [
      'language', 'enableConductor', 'skipOnboarding', 'defaultTier',
      'autoScanFileCap', 'autoScanFileCapSlice', 'tripwireMaxFileSizeKb', 'tripwireMaxLines',
      'tempSweepStaleDays', 'watchedExtensions',
      'ruleRevalidateDays', 'platformRuleRevalidateDays', 'definitionRevalidateDays',
      'platformDefinitionRevalidateDays', 'skillUpdateCheckDays',
      'disabledCanaries', 'rotCanaryMode', 'autoFixMode', 'schemaPaths', 'migrationDirs',
      'packageManifests', 'trustedDomains'
    ];
    const invalidKeys = Object.keys(cfg).filter((k) => !validKeys.includes(k));
    if (invalidKeys.length > 0) {
      fail(`.coalmine.json has unrecognized keys: ${invalidKeys.join(', ')}`);
    } else {
      if (cfg.language !== undefined && (typeof cfg.language !== 'string' || !['auto', 'th', 'en', 'ja', 'zh', 'es'].includes(cfg.language.toLowerCase()))) {
        fail(`.coalmine.json language must be one of: auto, th, en, ja, zh, es`);
      }
      if (cfg.enableConductor !== undefined && typeof cfg.enableConductor !== 'boolean') {
        fail(`.coalmine.json enableConductor must be a boolean`);
      }
      if (cfg.skipOnboarding !== undefined && typeof cfg.skipOnboarding !== 'boolean') {
        fail(`.coalmine.json skipOnboarding must be a boolean`);
      }
      if (cfg.defaultTier !== undefined && (typeof cfg.defaultTier !== 'string' || !['light', 'standard', 'heavy', 'auto'].includes(cfg.defaultTier.toLowerCase()))) {
        fail(`.coalmine.json defaultTier must be one of: Light, Standard, Heavy, auto`);
      }
      if (cfg.autoScanFileCap !== undefined && typeof cfg.autoScanFileCap !== 'number') {
        fail(`.coalmine.json autoScanFileCap must be a number`);
      }
      if (cfg.autoScanFileCapSlice !== undefined && typeof cfg.autoScanFileCapSlice !== 'number') {
        fail(`.coalmine.json autoScanFileCapSlice must be a number`);
      }
      if (cfg.tripwireMaxFileSizeKb !== undefined && typeof cfg.tripwireMaxFileSizeKb !== 'number') {
        fail(`.coalmine.json tripwireMaxFileSizeKb must be a number`);
      }
      if (cfg.tripwireMaxLines !== undefined && typeof cfg.tripwireMaxLines !== 'number') {
        fail(`.coalmine.json tripwireMaxLines must be a number`);
      }
      if (cfg.tempSweepStaleDays !== undefined && typeof cfg.tempSweepStaleDays !== 'number') {
        fail(`.coalmine.json tempSweepStaleDays must be a number`);
      }
      if (cfg.watchedExtensions !== undefined && (!Array.isArray(cfg.watchedExtensions) || cfg.watchedExtensions.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json watchedExtensions must be an array of strings`);
      }
      if (cfg.ruleRevalidateDays !== undefined && typeof cfg.ruleRevalidateDays !== 'number') {
        fail(`.coalmine.json ruleRevalidateDays must be a number`);
      }
      if (cfg.platformRuleRevalidateDays !== undefined && typeof cfg.platformRuleRevalidateDays !== 'number') {
        fail(`.coalmine.json platformRuleRevalidateDays must be a number`);
      }
      if (cfg.definitionRevalidateDays !== undefined && typeof cfg.definitionRevalidateDays !== 'number') {
        fail(`.coalmine.json definitionRevalidateDays must be a number`);
      }
      if (cfg.platformDefinitionRevalidateDays !== undefined && typeof cfg.platformDefinitionRevalidateDays !== 'number') {
        fail(`.coalmine.json platformDefinitionRevalidateDays must be a number`);
      }
      if (cfg.skillUpdateCheckDays !== undefined && typeof cfg.skillUpdateCheckDays !== 'number') {
        fail(`.coalmine.json skillUpdateCheckDays must be a number`);
      }
      if (cfg.disabledCanaries !== undefined && (!Array.isArray(cfg.disabledCanaries) || cfg.disabledCanaries.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json disabledCanaries must be an array of strings`);
      }
      if (cfg.rotCanaryMode !== undefined && (typeof cfg.rotCanaryMode !== 'string' || !['auto', 'manual', 'off'].includes(cfg.rotCanaryMode.toLowerCase()))) {
        fail(`.coalmine.json rotCanaryMode must be one of: auto, manual, off`);
      }
      if (cfg.autoFixMode !== undefined && (typeof cfg.autoFixMode !== 'string' || !['interactive', 'safe', 'off'].includes(cfg.autoFixMode.toLowerCase()))) {
        fail(`.coalmine.json autoFixMode must be one of: interactive, safe, off`);
      }
      if (cfg.schemaPaths !== undefined && (!Array.isArray(cfg.schemaPaths) || cfg.schemaPaths.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json schemaPaths must be an array of strings`);
      }
      if (cfg.migrationDirs !== undefined && (!Array.isArray(cfg.migrationDirs) || cfg.migrationDirs.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json migrationDirs must be an array of strings`);
      }
      if (cfg.packageManifests !== undefined && (!Array.isArray(cfg.packageManifests) || cfg.packageManifests.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json packageManifests must be an array of strings`);
      }
      if (cfg.trustedDomains !== undefined && (!Array.isArray(cfg.trustedDomains) || cfg.trustedDomains.some((x) => typeof x !== 'string'))) {
        fail(`.coalmine.json trustedDomains must be an array of strings`);
      }
      if (ok) pass('.coalmine.json');
    }
  } catch (e) {
    fail(`.coalmine.json invalid JSON: ${e.message}`);
  }
}

// 3. hooks present
console.log('hooks:');
for (const h of ['hooks/rot-canary-touch.js', 'hooks/rot-canary-stop.js', 'hooks/coalmine-conductor.js']) {
  fs.existsSync(path.join(repo, h)) ? pass(h) : fail(`${h} missing`);
}

// Aux files (references/, skill-meta.json) ship verbatim — byte-compare both
// directions so a hand-edited or orphaned dist file can never reach the marketplace.
function compareAux(srcDir, dstDir, label) {
  try {
    const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const e of srcEntries) {
      if (e.name === 'SKILL.md') continue;
      const sp = path.join(srcDir, e.name);
      const dp = path.join(dstDir, e.name);
      if (e.isDirectory()) {
        if (!fs.existsSync(dp)) { fail(`${label}/${e.name}/ missing — run: node scripts/build-plugin.mjs`); continue; }
        compareAux(sp, dp, `${label}/${e.name}`);
      } else {
        try {
          if (!fs.existsSync(dp)) fail(`${label}/${e.name} missing — run: node scripts/build-plugin.mjs`);
          else if (fs.readFileSync(sp, 'utf8').replace(/\r\n/g, '\n') !== fs.readFileSync(dp, 'utf8').replace(/\r\n/g, '\n')) fail(`${label}/${e.name} STALE vs source — run: node scripts/build-plugin.mjs`);
        } catch (err) { fail(`${label}/${e.name} compare failed: ${err.message}`); }
      }
    }
  } catch (err) {
    fail(`${label} source directory read failed: ${err.message}`);
  }
  try {
    const dstEntries = fs.readdirSync(dstDir, { withFileTypes: true });
    for (const e of dstEntries) {
      if (e.name === 'SKILL.md') continue;
      if (!fs.existsSync(path.join(srcDir, e.name))) fail(`${label}/${e.name} has no source — run: node scripts/build-plugin.mjs`);
    }
  } catch (err) {
    fail(`${label} dist directory read failed: ${err.message}`);
  }
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
    let got;
    try { got = fs.readFileSync(distMd, 'utf8'); }
    catch (e) { fail(`plugin/skills/${s} unreadable: ${e.message}`); continue; }
    if (got.includes('<!-- SHARED:')) { fail(`plugin/skills/${s} contains unresolved template markers — run: node scripts/build-plugin.mjs`); continue; }
    let want;
    try { want = renderSkillMd(path.join(skillsSrc, s), shared); }
    catch (e) { fail(`plugin/skills/${s} render failed: ${e.message}`); continue; }
    if (got.replace(/\r\n/g, '\n') !== want.replace(/\r\n/g, '\n')) { fail(`plugin/skills/${s} STALE vs source — run: node scripts/build-plugin.mjs`); continue; }
    compareAux(path.join(skillsSrc, s), path.join(pluginDir, 'skills', s), `plugin/skills/${s}`);
    pass(`plugin/skills/${s} in sync`);
  }
  // Reverse check: nothing ships from the dist that has no source (orphan guard).
  try {
    const pluginEntries = fs.readdirSync(pluginDir, { withFileTypes: true });
    for (const e of pluginEntries) {
      if (e.isDirectory()) {
        if (!['skills', 'hooks', '.claude-plugin', 'agents', 'commands'].includes(e.name)) {
          fail(`plugin/${e.name} is an orphan directory — run: node scripts/build-plugin.mjs`);
        }
      } else {
        fail(`plugin/${e.name} is an orphan file — run: node scripts/build-plugin.mjs`);
      }
    }
  } catch (e) { fail(`plugin/ root check failed: ${e.message}`); }

  try {
    const skillsDistDir = path.join(pluginDir, 'skills');
    if (fs.existsSync(skillsDistDir)) {
      const distEntries = fs.readdirSync(skillsDistDir, { withFileTypes: true });
      for (const e of distEntries) {
        if (e.isDirectory()) {
          if (!skills.includes(e.name)) {
            fail(`plugin/skills/${e.name} has no source — run: node scripts/build-plugin.mjs`);
          }
        } else {
          fail(`plugin/skills/${e.name} is an orphan file — run: node scripts/build-plugin.mjs`);
        }
      }
    }
  } catch (e) { fail(`plugin/skills check failed: ${e.message}`); }

  try {
    const hooksDistDir = path.join(pluginDir, 'hooks');
    if (fs.existsSync(hooksDistDir)) {
      const distEntries = fs.readdirSync(hooksDistDir, { withFileTypes: true });
      for (const e of distEntries) {
        if (e.isDirectory()) {
          fail(`plugin/hooks/${e.name} is an orphan directory — run: node scripts/build-plugin.mjs`);
        } else if (!['hooks.json', 'rot-canary-touch.js', 'rot-canary-stop.js', 'coalmine-conductor.js'].includes(e.name)) {
          fail(`plugin/hooks/${e.name} is an orphan file — run: node scripts/build-plugin.mjs`);
        }
      }
    }
  } catch (e) { fail(`plugin/hooks check failed: ${e.message}`); }

  try {
    const manifestDistDir = path.join(pluginDir, '.claude-plugin');
    if (fs.existsSync(manifestDistDir)) {
      const distEntries = fs.readdirSync(manifestDistDir, { withFileTypes: true });
      for (const e of distEntries) {
        if (e.isDirectory()) {
          fail(`plugin/.claude-plugin/${e.name} is an orphan directory — run: node scripts/build-plugin.mjs`);
        } else if (e.name !== 'plugin.json') {
          fail(`plugin/.claude-plugin/${e.name} is an orphan file — run: node scripts/build-plugin.mjs`);
        }
      }
    }
  } catch (e) { fail(`plugin/.claude-plugin check failed: ${e.message}`); }
  // Bundled extras (agents/, commands/) ship verbatim — both-direction guarantee.
  for (const extra of ['agents', 'commands']) {
    const src = path.join(repo, extra);
    const dist = path.join(pluginDir, extra);
    if (fs.existsSync(src)) {
      if (!fs.existsSync(dist)) fail(`plugin/${extra} missing — run: node scripts/build-plugin.mjs`);
      else compareAux(src, dist, `plugin/${extra}`);
    } else if (fs.existsSync(dist)) {
      fail(`plugin/${extra} has no source — run: node scripts/build-plugin.mjs`);
    }
  }
  for (const f of ['hooks/hooks.json', 'hooks/rot-canary-touch.js', 'hooks/rot-canary-stop.js', 'hooks/coalmine-conductor.js', '.claude-plugin/plugin.json']) {
    const distFile = path.join(pluginDir, f);
    if (!fs.existsSync(distFile)) { fail(`plugin/${f} missing — run: node scripts/build-plugin.mjs`); continue; }
    try {
      if (fs.readFileSync(path.join(repo, f), 'utf8').replace(/\r\n/g, '\n') !== fs.readFileSync(distFile, 'utf8').replace(/\r\n/g, '\n')) {
        fail(`plugin/${f} STALE vs ${f} — run: node scripts/build-plugin.mjs`);
      } else pass(`plugin/${f} in sync`);
    } catch (e) { fail(`plugin/${f} compare failed: ${e.message}`); }
  }
  try {
    const mkt = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin', 'marketplace.json'), 'utf8').replace(/^\uFEFF/, ''));
    const srcField = mkt.plugins?.[0]?.source;
    if (srcField === './plugin') pass('marketplace serves ./plugin (conformed dist)');
    else fail(`marketplace plugins[0].source is ${JSON.stringify(srcField)} — must be "./plugin" so installs get conformed skills`);
  } catch { /* manifest parse already checked above */ }
}

// 5. optional install target
const arg = process.argv[2];
if (arg) {
  const targetKey = arg.toLowerCase();
  const dest = TARGETS[targetKey] ?? path.resolve(arg);
  console.log(`target ${dest}:`);
  for (const s of skills) {
    const targetMd = path.join(dest, s, 'SKILL.md');
    if (!fs.existsSync(targetMd)) {
      fail(`${s} NOT at target`);
      continue;
    }
    let content;
    try { content = fs.readFileSync(targetMd, 'utf8'); }
    catch (e) { fail(`${s} at target unreadable: ${e.message}`); continue; }
    if (content.includes('<!-- SHARED:')) {
      fail(`${s} at target contains unresolved template markers!`);
    } else {
      pass(`${s} installed and conformed`);
    }
  }
}

console.log(ok ? '\nVERIFY: PASS' : '\nVERIFY: FAIL');
process.exit(ok ? 0 : 1);
