// Self-consistency checks — the "don't trust your own non-code artifacts" layer.
//
// CoalMine already byte-verifies the code it ships (verify.mjs). These checks
// extend that discipline to the things an agent TRUSTS but never verifies:
// cross-document facts that can silently drift apart, and the doctrine mirrors
// that live in three places and must stay identical. A divergence here is the
// mechanical signature of staleness or tampering (e.g. a poisoned rules copy).
//
// Memory poisoning that is purely semantic (a prescription that contradicts a
// Commandment) has no canonical baseline to diff against — that is caught by the
// gold-standard RE-VALIDATE pass, not here. These functions are the mechanical,
// zero-false-positive half.
//
// Each returns an array of { level, msg }. Pure, Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { listSkills } from './render.mjs';

// The doctrine documents that are deliberately duplicated. Each logical doc has
// its canonical copy at the org (TheColliery/.github) plus these per-machine rule-home mirrors.
// Whatever copies EXIST on a machine must be byte-identical; a missing mirror is
// fine (not every clone installs the rule home), a differing one is not.
const DOCTRINE_MIRRORS = [
  {
    name: 'hooks-safety',
    copies: [
      '.claude/rules/ecc/domain/hooks-safety.md',
      '.agents/rules/ecc/domain/hooks-safety.md',
    ],
  },
  {
    name: 'scripts-quality',
    copies: [
      '.claude/rules/ecc/domain/scripts-quality.md',
      '.agents/rules/ecc/domain/scripts-quality.md',
    ],
  },
];

const norm = (s) => s.replace(/\r\n/g, '\n');

// 1. The shipped skill count must agree across every place that states it.
// Source of truth = the skills/ directory; plugin.json must not drift from it
// (this is the "About said 5 canaries for four versions" class, mechanized).
export function checkCanaryCount(repo) {
  const out = [];
  let actual;
  try {
    actual = listSkills(path.join(repo, 'skills')).length;
  } catch (e) {
    return [{ level: 'FAIL', msg: `consistency: cannot count skills/: ${e.message}` }];
  }
  try {
    const desc = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin', 'plugin.json'), 'utf8').replace(/^\uFEFF/, '')).description || '';
    const m = desc.match(/(\d+)\s+quality-canary/);
    if (!m) {
      out.push({ level: 'FAIL', msg: `consistency: plugin.json description has no "<N> quality-canary" count to cross-check` });
    } else if (Number(m[1]) !== actual) {
      out.push({ level: 'FAIL', msg: `consistency: plugin.json says ${m[1]} quality-canary skills but skills/ has ${actual}` });
    }
  } catch (e) {
    out.push({ level: 'FAIL', msg: `consistency: plugin.json unreadable: ${e.message}` });
  }
  return out;
}

// 1b. The supported-agent count must agree between targets.mjs (the source of
// truth for install targets) and the README's agent table. This is the
// "badge/table still said 12 agents after a target was dropped" class,
// mechanized: the count lives in exactly one place (table rows == targets.mjs),
// so a stale "N agents" can never ship. Prose elsewhere is kept number-free.
export function checkAgentCount(repo) {
  const out = [];
  let defined;
  try {
    const tsrc = fs.readFileSync(path.join(repo, 'scripts', 'lib', 'targets.mjs'), 'utf8');
    defined = (tsrc.match(/^\s+[a-zA-Z]+:\s+path\./gm) || []).length;
    if (defined === 0) return [{ level: 'FAIL', msg: 'consistency: no agent targets found in scripts/lib/targets.mjs' }];
  } catch (e) {
    return [{ level: 'FAIL', msg: `consistency: targets.mjs unreadable: ${e.message}` }];
  }
  const readmePath = path.join(repo, 'README.md');
  if (!fs.existsSync(readmePath)) return out; // partial copy without README (e.g. test fixture) — nothing to cross-check
  try {
    const lines = fs.readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const hdr = lines.findIndex((l) => l.includes('Target Skills Folder'));
    if (hdr < 0) {
      out.push({ level: 'FAIL', msg: 'consistency: README agent table ("Target Skills Folder" header) not found' });
      return out;
    }
    let rows = 0; // hdr+1 is the |---| separator; data rows start at hdr+2
    for (let i = hdr + 2; i < lines.length && lines[i].trimStart().startsWith('|'); i++) rows++;
    if (rows !== defined) {
      out.push({ level: 'FAIL', msg: `consistency: README agent table has ${rows} rows but targets.mjs defines ${defined} agents — update whichever is stale` });
    }
  } catch (e) {
    out.push({ level: 'FAIL', msg: `consistency: README.md unreadable: ${e.message}` });
  }
  return out;
}

// 1c. Any issue-template line carrying a `version-pin:` marker must quote the
// current plugin.json version, or the gate fails — the "stale v2.4.0 shipped in
// a docs example" class, mechanized — while a concrete version can still serve
// as a form placeholder. Scope is the issue templates ONLY: that is where a
// literal version legitimately lives. Narrative docs (README, CHANGELOG) and the
// machine-local governance files describe this feature and cite old versions, so
// scanning them would self-trip; a .md doc should drop the version entirely
// instead (e.g. SECURITY.md verifies via `git describe`). The colon form means a
// mention of the word without the colon is never treated as a pin.
const VERSION_PIN_MARKER = 'version-pin:';
export function checkVersionPins(repo) {
  const out = [];
  let version;
  try {
    version = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin', 'plugin.json'), 'utf8').replace(/^\uFEFF/, '')).version;
  } catch (e) {
    return [{ level: 'FAIL', msg: `consistency: plugin.json unreadable for version-pin check: ${e.message}` }];
  }
  const tplDir = path.join(repo, '.github', 'ISSUE_TEMPLATE');
  let names = [];
  try { names = fs.readdirSync(tplDir).filter((f) => /\.ya?ml$/.test(f)); } catch { return out; }
  for (const name of names) {
    const file = path.join(tplDir, name);
    let lines;
    try { lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n'); } catch { continue; }
    lines.forEach((line, i) => {
      if (!line.includes(VERSION_PIN_MARKER)) return;
      const at = `${path.relative(repo, file)}:${i + 1}`;
      const m = line.match(/v(\d+\.\d+\.\d+)/);
      if (!m) out.push({ level: 'FAIL', msg: `consistency: ${at} is marked version-pin but has no vX.Y.Z to check` });
      else if (m[1] !== version) out.push({ level: 'FAIL', msg: `consistency: ${at} pins v${m[1]} but plugin.json is v${version} — bump the pin` });
    });
  }
  return out;
}

// 2. Doctrine mirrors must be byte-identical wherever they exist. A lone diverging
// copy is the mechanical fingerprint of a stale sync or a tampered rule file.
export function checkDoctrineMirrors(repo) {
  const out = [];
  for (const doc of DOCTRINE_MIRRORS) {
    const present = [];
    for (const rel of doc.copies) {
      const p = path.join(repo, rel);
      try {
        if (fs.existsSync(p)) present.push({ rel, body: norm(fs.readFileSync(p, 'utf8')) });
      } catch (e) {
        out.push({ level: 'FAIL', msg: `consistency: ${rel} unreadable: ${e.message}` });
      }
    }
    if (present.length < 2) continue; // 0 or 1 copy on this machine — nothing to cross-check
    const baseline = present[0];
    for (const other of present.slice(1)) {
      if (other.body !== baseline.body) {
        out.push({ level: 'FAIL', msg: `consistency: doctrine '${doc.name}' DIVERGED — ${other.rel} differs from ${baseline.rel} (stale mirror or tampering)` });
      }
    }
  }
  return out;
}

// 3. Every CoalMine stamp in the rule home must be well-formed, so a malformed or
// truncated stamp can't silently disable freshness tracking. (Past-due dates are
// /coalmine:stats' job; this only checks the shape.)
//
// A real stamp is an HTML comment: `<!-- coalmine: verified <date> · ... ·
// revalidate <N>d -->`. The opener identifies a stamp; the full pattern validates
// it. Both are case-sensitive and require the comment form, so prose that merely
// MENTIONS the phrase (the conductor's "no `coalmine: verified` stamp") and the
// uppercase COALMINE:START/END install markers are never mistaken for stamps.
const STAMP_OPEN = /<!--\s*coalmine:\s*verified/;
const STAMP_RE = /<!--\s*coalmine:\s*verified\s+\d{4}-\d{2}-\d{2}[\s\S]*?revalidate\s+\d+d[\s\S]*?-->/;
export function checkRuleStamps(repo) {
  const out = [];
  const roots = ['.claude/rules', '.agents/rules'].map((r) => path.join(repo, r));
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) {
        let body;
        try { body = fs.readFileSync(p, 'utf8'); } catch { continue; }
        if (STAMP_OPEN.test(body) && !STAMP_RE.test(body)) {
          out.push({ level: 'FAIL', msg: `consistency: ${path.relative(repo, p)} has a malformed coalmine stamp (expected "verified <YYYY-MM-DD> ... revalidate <N>d")` });
        }
      }
    }
  };
  for (const r of roots) walk(r);
  return out;
}

// Tracked-file checks safe to run in the commit gate (no machine-local rule home
// required). Returns findings[]; empty = consistent.
export function checkTracked(repo) {
  return [...checkCanaryCount(repo), ...checkAgentCount(repo), ...checkVersionPins(repo)];
}

// Every check, for the on-demand consistency CLI (includes machine-local rule home).
export function checkAll(repo) {
  return [...checkCanaryCount(repo), ...checkAgentCount(repo), ...checkVersionPins(repo), ...checkDoctrineMirrors(repo), ...checkRuleStamps(repo)];
}
