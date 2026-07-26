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

// The two doctrine rule homes. `.claude/rules/ecc/` is what Claude reads;
// `.agents/rules/ecc/` is what the non-Claude agents (Antigravity, Codex, Cursor)
// read. Neither population can see the other's tree, so a divergence is invisible
// from both sides and the two run different rulebooks — which is why this is a
// mechanical check and not a review item. The canonical copy lives in a SEPARATE
// repo (the org TheColliery/.github) that this check CANNOT reach at runtime — a
// stranger's CoalMine clone has no path to it — so the org copy is OUT OF SCOPE by
// construction; keeping the local homes in sync with it is a release-time concern.
//
// ENUMERATED, never a hard-coded pair list. A list rots on every rule added: the
// list this replaced named 2 files, so 19 of the 21 rules in a populated home were
// never compared at all and the check reported agreement over them.
//
// THE TWO ABSENCES ARE DIFFERENT THINGS, and conflating them is what made the old
// carve-out ("a missing mirror is fine") swallow real drift:
//   - the whole counterpart TREE absent  → SILENT (the legitimate case: a clone that
//     never installed that rule home — this repo itself has neither tree today)
//   - the tree PRESENT but a file missing from it → FAIL (drift wearing the costume
//     of the carve-out)
// Comparison is CRLF-normalized, not raw bytes: a line-ending difference between two
// checkouts is not doctrine drift.
//
// RETIRED.md mirrors like every other rule — deliberately NO exception. It is never
// `@imported` (deleting a dead rule must cost zero always-loaded tokens), but "not
// loaded" is not "may disagree": a tombstone ledger that tells the two populations
// different things about what was retired is still two rulebooks. Both copies exist
// and agree today, so the exception would buy nothing and cost a permanent carve-out.
//
// NAMED ASYMMETRY (legitimate, not drift): `.agents/rules/coalmine-trigger.md` has no
// `.claude` counterpart — it is the trigger table for agents that do not receive
// triggers from the plugin, and Claude does. It sits OUTSIDE `ecc/`, so this
// ecc-scoped walk never sees it; that placement IS the mechanism, not an oversight.
const MIRROR_ROOTS = ['.claude/rules/ecc', '.agents/rules/ecc'];

const norm = (s) => s.replace(/\r\n/g, '\n');

// Recursive .md walk yielding { abs, rel } with a POSIX-style rel key so the two
// trees compare on the same spelling on Windows. Symlinked directories are not
// followed (`isDirectory()` is false for a link) — no cycle risk, and a rule home
// is a plain directory.
function* walkMd(dir, rel = '') {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walkMd(abs, r);
    else if (e.name.endsWith('.md')) yield { abs, rel: r };
  }
}

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

// 1e. The conductor hook's own "N quality canaries installed" string — the
// FIRST thing injected into every session, so a drift here is the highest-
// exposure instance of the same class as #1 above (which checks plugin.json vs
// skills/ only). Still not every surface that states the count (~11 known,
// per the audit) — this + #1 are the two the commit-gate can mechanically
// reach without a browser-rendered check; the rest are markdown prose swept
// manually on release (scripts-quality.md's per-version doc-spot checklist).
export function checkConductorCanaryCount(repo) {
  const out = [];
  let actual;
  try {
    actual = listSkills(path.join(repo, 'skills')).length;
  } catch (e) {
    return [{ level: 'FAIL', msg: `consistency: cannot count skills/: ${e.message}` }];
  }
  const p = path.join(repo, 'hooks', 'coalmine-conductor.js');
  let src;
  try {
    src = fs.readFileSync(p, 'utf8');
  } catch (e) {
    return [{ level: 'FAIL', msg: `consistency: hooks/coalmine-conductor.js unreadable: ${e.message}` }];
  }
  const m = src.match(/\[CoalMine\]\s+(\d+)\s+quality canaries installed/);
  if (!m) {
    out.push({ level: 'FAIL', msg: 'consistency: hooks/coalmine-conductor.js has no "<N> quality canaries installed" string to cross-check' });
  } else if (Number(m[1]) !== actual) {
    out.push({ level: 'FAIL', msg: `consistency: conductor hook says ${m[1]} quality canaries but skills/ has ${actual}` });
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

// 1d. The JSONC comment-stripper regex is hand-duplicated in jsonc.mjs (ESM) and
// hooks/_shared/node-config.js (CJS — Phoenix self-contained, can't require()).
// Each has its own test, but no test reads BOTH; a divergence in one would not be
// mechanically caught. This extracts the regex literal from each and fails if they
// differ — the "two copies silently drift" class, mechanized (no runtime change).
//
// THIRD COPY (PS, deliberately NOT in this literal compare): hooks/_shared/ps-config.ps1
// Remove-JsoncComments is a hand-written character state machine, not a regex, so it has
// no equivalent literal to diff against the two JS copies — a cross-language literal
// compare is infeasible, not omitted by oversight. Its parity is guarded BEHAVIORALLY
// instead: the cross-stripper equivalence fixtures in scripts/lib/jsonc.test.mjs are
// mirrored by scripts/lib/ps-config.test.ps1 (H4), so the PS port must produce identical
// parse results on the same inputs. Do NOT fake a literal compare here.
const JSONC_REGEX_RE = /\.replace\((\/"\(\?:[\s\S]*?\/g),/;
export function checkJsoncRegexSync(repo) {
  const out = [];
  const sources = [
    'scripts/lib/jsonc.mjs',
    'hooks/_shared/node-config.js',
  ];
  const literals = [];
  for (const rel of sources) {
    const p = path.join(repo, rel);
    let body;
    try { body = fs.readFileSync(p, 'utf8'); } catch (e) {
      out.push({ level: 'FAIL', msg: `consistency: ${rel} unreadable for jsonc-regex sync: ${e.message}` });
      return out;
    }
    const m = body.match(JSONC_REGEX_RE);
    if (!m) {
      out.push({ level: 'FAIL', msg: `consistency: could not locate the JSONC stripper regex in ${rel}` });
      return out;
    }
    literals.push({ rel, lit: m[1] });
  }
  if (literals[0].lit !== literals[1].lit) {
    out.push({ level: 'FAIL', msg: `consistency: JSONC stripper regex DIVERGED — ${literals[1].rel} differs from ${literals[0].rel} (keep the two copies in sync)` });
  }
  return out;
}

// 2. Every rule in one doctrine home must exist, and agree, in the other. A missing
// counterpart or a diverging copy is the mechanical fingerprint of a stale sync, a
// half-finished rule addition, or a tampered rule file.
export function checkDoctrineMirrors(repo) {
  const out = [];
  const [claudeRoot, agentsRoot] = MIRROR_ROOTS.map((r) => path.join(repo, r));
  const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
  // Whole tree absent on either side = this clone does not keep that rule home.
  if (!isDir(claudeRoot) || !isDir(agentsRoot)) return out;

  const read = (abs) => { try { return norm(fs.readFileSync(abs, 'utf8')); } catch (e) { return e; } };
  const side = (root) => new Map([...walkMd(root)].map((f) => [f.rel, f.abs]));
  const a = side(claudeRoot);
  const b = side(agentsRoot);

  // Union, both directions: a rule only Claude sees and a rule only the other agents
  // see are the SAME defect (two populations, two rulebooks) pointed opposite ways.
  // Sorted so the gate's output is deterministic across platforms (Phoenix #8).
  for (const rel of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const [pa, pb] = [a.get(rel), b.get(rel)];
    if (!pa || !pb) {
      const [have, missing] = pa ? [MIRROR_ROOTS[0], MIRROR_ROOTS[1]] : [MIRROR_ROOTS[1], MIRROR_ROOTS[0]];
      out.push({ level: 'FAIL', msg: `consistency: doctrine '${rel}' UNMIRRORED — present in ${have}/ but MISSING from ${missing}/ (the two agent populations would read different rulebooks)` });
      continue;
    }
    const [ba, bb] = [read(pa), read(pb)];
    for (const [body, root] of [[ba, MIRROR_ROOTS[0]], [bb, MIRROR_ROOTS[1]]]) {
      if (body instanceof Error) out.push({ level: 'FAIL', msg: `consistency: ${root}/${rel} unreadable: ${body.message}` });
    }
    if (ba instanceof Error || bb instanceof Error) continue;
    if (ba !== bb) {
      out.push({ level: 'FAIL', msg: `consistency: doctrine '${rel}' DIVERGED — ${MIRROR_ROOTS[1]}/${rel} differs from ${MIRROR_ROOTS[0]}/${rel} (stale mirror or tampering)` });
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
// `g` so a malformed opener early in the file doesn't mask a well-formed stamp
// later — every opener is located and validated against a bounded window.
const STAMP_OPEN = /<!--\s*coalmine:\s*verified/g;
const STAMP_RE = /<!--\s*coalmine:\s*verified\s+\d{4}-\d{2}-\d{2}[\s\S]*?revalidate\s+\d+d[\s\S]*?-->/;
// A real stamp is ~80-150 chars; cap the window the full pattern ever sees. The
// pattern has two lazy [\s\S]*? that backtrack O(n^2) on a poisoned .md (many
// `revalidate Nd` hits with no closing `-->`), so feeding it a whole megabyte was a
// quadratic DoS reachable via `node scripts/consistency.mjs` on a poisoned rule
// file. Bounding the input to a constant makes the per-file cost O(1) in the regex
// (so O(n) over the file): even worst-case backtracking is over <= STAMP_WINDOW chars.
const STAMP_WINDOW = 2048;
export function checkRuleStamps(repo) {
  const out = [];
  // Scope is the whole rules home (not just ecc/) — a stamp is well-formed or not
  // wherever it sits. Shares walkMd with the mirror check above: one walker, so a
  // future change to what counts as a rule file cannot apply to only one of them.
  const roots = ['.claude/rules', '.agents/rules'].map((r) => path.join(repo, r));
  for (const root of roots) {
    for (const { abs: p } of walkMd(root)) {
      let body;
      try { body = fs.readFileSync(p, 'utf8'); } catch { continue; }
      STAMP_OPEN.lastIndex = 0;
      let m;
      let bad = false;
      let any = false;
      while ((m = STAMP_OPEN.exec(body)) !== null) {
        any = true;
        // Validate only a bounded slice anchored at this opener — a well-formed
        // stamp fits easily; a poisoned blob can never grow the regex's work.
        if (STAMP_RE.test(body.slice(m.index, m.index + STAMP_WINDOW))) { bad = false; break; }
        bad = true;
      }
      if (any && bad) {
        out.push({ level: 'FAIL', msg: `consistency: ${path.relative(repo, p)} has a malformed coalmine stamp (expected "verified <YYYY-MM-DD> ... revalidate <N>d")` });
      }
    }
  }
  return out;
}

// Tracked-file checks safe to run in the commit gate (no machine-local rule home
// required). Returns findings[]; empty = consistent.
export function checkTracked(repo) {
  return [...checkCanaryCount(repo), ...checkConductorCanaryCount(repo), ...checkAgentCount(repo), ...checkVersionPins(repo), ...checkJsoncRegexSync(repo)];
}

// Every check, for the on-demand consistency CLI (includes machine-local rule home).
export function checkAll(repo) {
  return [...checkCanaryCount(repo), ...checkConductorCanaryCount(repo), ...checkAgentCount(repo), ...checkVersionPins(repo), ...checkJsoncRegexSync(repo), ...checkDoctrineMirrors(repo), ...checkRuleStamps(repo)];
}
