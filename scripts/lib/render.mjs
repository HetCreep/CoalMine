// CoalMine render core — the ONLY place that knows how SKILL.md templates,
// skills/_shared/ partials, and skill-meta.json intents combine into a
// conformed skill. Shared by install.mjs (agent targets), build-plugin.mjs
// (committed plugin/ dist), and verify.mjs (drift detection) so every route
// ships byte-identical content. Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';

export function loadShared(sharedDir) {
  return {
    languageHeader:   fs.readFileSync(path.join(sharedDir, 'language-header.md'),   'utf8').trimEnd(),
    contexts:         fs.readFileSync(path.join(sharedDir, 'contexts.md'),           'utf8').trimEnd(),
    orchestration:    fs.readFileSync(path.join(sharedDir, 'orchestration.md'),      'utf8').trimEnd(),
    escalationFooter: fs.readFileSync(path.join(sharedDir, 'escalation-footer.md'),  'utf8').trimEnd(),
  };
}

export function inject(content, shared, meta) {
  const orchestration = shared.orchestration
    .replace(/\{\{LIGHT_INTENT\}\}/g,    meta.lightIntent    ?? '')
    .replace(/\{\{STANDARD_INTENT\}\}/g, meta.standardIntent ?? '')
    .replace(/\{\{HEAVY_INTENT\}\}/g,    meta.heavyIntent    ?? '');

  return content
    .replace(/<!-- SHARED:LANGUAGE_HEADER -->/g,   shared.languageHeader)
    .replace(/<!-- SHARED:CONTEXTS -->/g,            shared.contexts)
    .replace(/<!-- SHARED:ORCHESTRATION -->/g,       orchestration)
    .replace(/<!-- SHARED:ESCALATION_FOOTER -->/g,   shared.escalationFooter);
}

export function listSkills(skillsSrc) {
  return fs.readdirSync(skillsSrc, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);
}

// Render one skill's SKILL.md template (with its skill-meta.json intents) to a string.
export function renderSkillMd(skillDir, shared) {
  const raw = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  const metaPath = path.join(skillDir, 'skill-meta.json');
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    : {};
  return inject(raw, shared, meta);
}

// Materialize one conformed skill dir: aux files copied, SKILL.md rendered.
// Nested dirs (references/, scripts/) copy recursively — anthropics/skills-style
// skill bundles must not break the installer.
export function installSkillDir(from, to, shared) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from, { withFileTypes: true })) {
    if (f.name === 'SKILL.md') continue;
    const src = path.join(from, f.name);
    const dst = path.join(to, f.name);
    if (f.isDirectory()) fs.cpSync(src, dst, { recursive: true });
    else fs.copyFileSync(src, dst);
  }
  if (fs.existsSync(path.join(from, 'SKILL.md'))) {
    fs.writeFileSync(path.join(to, 'SKILL.md'), renderSkillMd(from, shared), 'utf8');
  }
}
