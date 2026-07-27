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
// THE TOMBSTONE LEDGER IS NOT A RULE and must not live in either tree — reversing this
// file's own earlier "RETIRED.md mirrors like every other rule, deliberately NO
// exception". That rested on "it is never `@imported`", which is true and IRRELEVANT:
// `.claude/rules/**` is auto-loaded as a DIRECTORY, so the ledger was paid for in every
// session and grew forever, collapsing skill-authoring.md §6's entire point — retiring a
// dead rule must cost nothing. Since 2026-07-27 it is a SINGLE un-mirrored copy outside
// both trees, and that LOCATION is the mechanism: one copy cannot diverge from itself,
// which is exactly the property this check had to enforce while two copies existed.
//
// A tombstone found INSIDE a tree therefore FAILS, and neither existing verdict would
// have said so: mirrored into both trees it agrees with itself and passes SILENTLY (an
// invisible regression), and one-sided it reads as UNMIRRORED — whose remedy, "add it to
// the other tree", is now precisely the wrong move. Scope limit, stated rather than
// implied: this only sees a tombstone that came BACK inside a tree. Nothing here checks
// that the ledger still exists at its new home — that lives outside the trees, and §6
// accepts it as unguarded.
//
// NAMED ASYMMETRY (legitimate, not drift): `.agents/rules/coalmine-trigger.md` has no
// `.claude` counterpart — it is the trigger table for agents that do not receive
// triggers from the plugin, and Claude does. It sits OUTSIDE `ecc/`, so this
// ecc-scoped walk never sees it; that placement IS the mechanism, not an oversight.
const MIRROR_ROOTS = ['.claude/rules/ecc', '.agents/rules/ecc'];
const TOMBSTONE = 'RETIRED.md';

const norm = (s) => s.replace(/\r\n/g, '\n');

// Recursive .md walk yielding { abs, rel } with a POSIX-style rel key so the two
// trees compare on the same spelling on Windows. Symlinked directories are not
// followed (`isDirectory()` is false for a link) — no cycle risk, and a rule home
// is a plain directory.
//
// THROWS on an unreadable directory, and that is the point. A guard rests on TWO
// capability checks — the stat PROBE (`kind()` below) and this ENUMERATION — and
// hardening one leaves the other. Swallowing a readdir failure yields an EMPTY tree,
// so two genuinely diverged rule homes report agreement over zero files compared:
// the same fail-OPEN hole as the probe's, one level down. POSIX `chmod 0100` is
// exactly that state — stat succeeds, readdir does not. Same tri-state rule:
// ENOENT/ENOTDIR = the directory really is not there; anything else (EACCES, EPERM,
// EIO) = could not enumerate, which is not the same as knowing it is empty. Every
// caller turns the throw into its own FAIL finding, so one guard here covers both.
function* walkMd(dir, rel = '') {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return; throw e; }
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
  // The same two-absences split as the doctrine mirror, and the stakes are higher: this
  // check rides checkTracked = the COMMIT GATE. A repo with no `.github/ISSUE_TEMPLATE`
  // is the COMMON case (a fresh clone, a partial copy, a test fixture) and must never
  // start blocking commits — so ENOENT/ENOTDIR stays silent. But a directory we could
  // not READ is not a directory with no templates: swallowing that passed the pin gate
  // over templates never opened.
  try { names = fs.readdirSync(tplDir).filter((f) => /\.ya?ml$/.test(f)); }
  catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return out;
    out.push({ level: 'FAIL', msg: `consistency: .github/ISSUE_TEMPLATE could not be enumerated (${e.code || e.message}) — cannot prove the version pins are current` });
    return out;
  }
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
  // Tri-state, NOT a boolean: the carve-out below is "this clone does not keep that
  // rule home", and ONLY a genuinely absent path can claim it. Collapsing every other
  // outcome into "absent" made the one fail-OPEN hole in this guard — a regular FILE
  // at .agents/rules/ecc silently bypassed the whole check while .claude held rules.
  // ENOENT/ENOTDIR = the home really is not there. Anything else (EACCES, EPERM, EIO)
  // means we could not TELL, which is not the same as knowing it is absent.
  const kind = (p) => {
    try { return fs.statSync(p).isDirectory() ? 'dir' : 'notdir'; }
    catch (e) {
      if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') return 'unreadable';
      // ENOENT with the directory ENTRY still on disk = a DANGLING link: something
      // claims the rule home and delivers nothing. `statSync` FOLLOWS the link and
      // reports the missing TARGET, so only `lstat` separates "no home here" from "a
      // broken one" — and a broken one is malformed, the same fail-OPEN bypass as the
      // regular-file case above wearing a different entry type.
      try { fs.lstatSync(p); return 'notdir'; } catch { return 'absent'; }
    }
  };
  const kinds = [kind(claudeRoot), kind(agentsRoot)];
  for (const [i, k] of kinds.entries()) {
    if (k === 'notdir') out.push({ level: 'FAIL', msg: `consistency: ${MIRROR_ROOTS[i]} exists but is NOT a directory — the doctrine-mirror carve-out covers an ABSENT rule home, never a malformed one` });
    else if (k === 'unreadable') out.push({ level: 'FAIL', msg: `consistency: ${MIRROR_ROOTS[i]} could not be inspected — cannot prove the two rule homes agree` });
  }
  if (out.length) return out; // malformed on either side: fail CLOSED, never silent
  // Whole tree absent on either side = this clone does not keep that rule home.
  if (kinds.includes('absent')) return out;

  const read = (abs) => { try { return norm(fs.readFileSync(abs, 'utf8')); } catch (e) { return e; } };
  const side = (root) => { try { return new Map([...walkMd(root)].map((f) => [f.rel, f.abs])); } catch (e) { return e; } };
  const a = side(claudeRoot);
  const b = side(agentsRoot);
  // A home we could not enumerate is not an empty one — reporting agreement over
  // files never opened is the same false all-clear the pair list used to produce.
  for (const [m, root] of [[a, MIRROR_ROOTS[0]], [b, MIRROR_ROOTS[1]]]) {
    if (m instanceof Error) out.push({ level: 'FAIL', msg: `consistency: ${root} could not be enumerated (${m.code || m.message}) — cannot prove the two rule homes agree` });
  }
  if (out.length) return out; // blind on either side: fail CLOSED, never silent

  // Union, both directions: a rule only Claude sees and a rule only the other agents
  // see are the SAME defect (two populations, two rulebooks) pointed opposite ways.
  // Sorted so the gate's output is deterministic across platforms (Phoenix #8).
  for (const rel of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (rel === TOMBSTONE || rel.endsWith(`/${TOMBSTONE}`)) {
      const at = [[a, MIRROR_ROOTS[0]], [b, MIRROR_ROOTS[1]]].filter(([m]) => m.has(rel)).map(([, r]) => `${r}/${rel}`);
      out.push({ level: 'FAIL', msg: `consistency: ${at.join(' + ')} — a tombstone ledger must NOT live inside a rule tree (the whole tree is always-loaded, so retiring a rule would cost tokens forever). DELETE it here; its home is the single un-mirrored copy outside both trees.` });
      continue;
    }
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
    let files;
    try { files = [...walkMd(root)]; }
    catch (e) {
      out.push({ level: 'FAIL', msg: `consistency: ${path.relative(repo, root)} could not be enumerated (${e.code || e.message}) — cannot prove its stamps are well-formed` });
      continue;
    }
    for (const { abs: p } of files) {
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
