// CWK-075 — POINTER gate. Ship-text names something that cannot be reached.
//
// WHY THIS IS NOT CWK-060's GATE. That one resolves KEYS against config-schema.mjs.
// These are POINTERS — to a file, a directory, a section, a symbol — and nothing
// resolved them. Same family, different resolver: the key gate asks "is this name in
// the schema", this one asks "is the thing this name points at REACHABLE FROM A CLONE".
//
// THE CHAIR'S RULING THIS ENFORCES (settled; this module does not re-decide it):
// a probe cited as proof is not a throwaway. Cite the DURABLE artefact — a commit SHA,
// a reviewer return, a lab record — and recycle the probe; if the probe file is the only
// evidence, it has stopped being a throwaway, so commit it or restate the claim. A
// GITIGNORED PATH IS NOT A DURABLE CITATION. The gate enforces that distinction. It does
// NOT ban citations, and the shape of that restraint is the whole detection rule below.
//
// ============================================================================
// DETECTION RULE — every step MEASURED on this repo's own 34 shipped surfaces
// before it was chosen, because cry-wolf is the failure mode this room has already
// paid for once (the tripwireMaxLines gate firing on compliant code).
//
//   The rule is TWO layers, and which layer a test belongs to is not cosmetic:
//   SHAPE tests live in pointerCandidates (text only, no tree knowledge); SCOPE tests
//   live in checkPointers (ourRoots, agentHomes, hasEntry). A shape rule that needs the
//   tree is a rule in the wrong place, and CWK-075 r2 moved one back after it silently
//   excluded four of our own tracked files.
//
//   SHAPE (pointerCandidates)                          drops
//     - whitespace                a command or a Markdown table row, not a pointer
//     - <placeholder>             the author already said "not a literal path"
//     - glob metacharacter        a glob names a SET, not a file
//     - no `/`                    a bare filename is the SCANNED user's repo's
//     - absolute / `~` / URL      not this repo's to resolve
//     - a `.` or `..` SEGMENT     navigates, does not NAME; and would escape the repo
//
//   SCOPE (checkPointers)                              decides
//     - an agent install home     the SCANNED project's tree, even where the root is ours
//     - first segment in ourRoots resolve from the repo root
//     - first segment beside the  resolve from the citing file's own directory (or its
//       citer (or its parent)     parent) -- structural, so it is never circular
//
//   MEASURED on this repo, 84 surfaces: 1,510 backticked tokens with fenced code
//   stripped -> 131 survive the shape funnel -> 71 IN SCOPE -> 71 resolve, 0
//   non-resolving, 0.0% noise. A DATED SNAPSHOT, and it drifts as this very header
//   gains citations -- it read 67 while the breakdown below already said 71, the two
//   halves of one comment disagreeing. Re-derive with the walk in verify.mjs 2.11 and
//   read the gate's own pass line; never quote these numbers forward.
//
//   THE TWO SCOPE TESTS ARE CWK-075 ROUND 2, AND BOTH CLOSED A SILENT HOLE, which is the
//   quieter failure and the one this whole class is about. Before them the gate was
//   repo-root-anchored and dropped every dot-first token, so 40 citations were checked
//   where 67 were checkable:
//     +15  citer-relative -- `references/checks.md` cited from its own skill dir was
//          never checked at all. A sibling room's gate called such a path NON-RESOLVING
//          (a loud false positive); ours dropped it from coverage without a word.
//     +16  dot-dir -- `.claude-plugin/plugin.json`, `.githooks/`, `.github/workflows/ci.yml`
//          are real TRACKED files of ours that the extractor discarded on sight. TWELVE
//          were in the surfaces as they stood; the other four are dot-dir citations this
//          very header adds while explaining the fix, and they are dot-dir citations like
//          any other -- an earlier wording counted them as a separate "+4 new header"
//          term, which double-counts the same tokens under two labels. 15 + 16 = 31, and
//          40 + 31 = 71, the number the pass line reports.
//   Noise stayed 0.0% across both, which is the number that had to hold.
//
// THE INSIGHT THAT MAKES THE RULE WORK, and a naive rule unusable: a shipped skill's
// prose names files in the SCANNED USER's repo — `package-lock.json`, `STANDARDS.md`,
// a bare `SKILL.md` — which by construction do not exist in ours. Those are not
// pointers into our tree at all. Steps 5-8 are four different ways of saying the same
// thing: only a path ROOTED IN OUR OWN TREE is a claim this repo can be wrong about.
//
// Steps 2, 3, 6 and 7 were NOT in the rule as first sketched, and each removed a whole
// class of false positive that a directory-component rule alone leaves standing:
//   2  shell commands and Markdown table rows are path-shaped (`node scripts/install.mjs
//      cursor`, `| package | direct/transitive | ... |`) — a SPACE is what separates a
//      command from a pointer.
//   3  `<gitroot>/.coalmine.json`, `plugin/skills/<name>/SKILL.md` are TEMPLATES; the
//      angle bracket is the author already saying "this is not a literal path".
//   6  a URL or an absolute path is not this repo's to resolve.
//   7  `.cursor/skills/`, `.gemini/skills/`, `.claude/rules/`, `.git/hooks` — a DOT-DIR
//      is an agent or tool HOME, and shipped prose names those in the USER's project.
//      This is step 8's insight one level up, and without it the residue is 15.9% noise
//      of which every single flag is wrong.
//
// NAMED BLIND SPOTS — stated as what is UNCOVERED, with its measured cost, never as a
// denial. A reader who is only told what the gate is NOT learns nothing about what is
// exposed; this room's own flock rail, applied to this gate first.
//
//   1. AN UNBACKTICKED PATH IS INVISIBLE. Extraction keys on backticks, so a path named
//      in plain prose is never a candidate — it cannot fail, and it cannot be counted in
//      the pass line either. MEASURED, fenced code stripped FIRST (a sibling room's own
//      count moved 6 -> 7 -> 2 the moment fences were stripped, so the order is part of
//      the measurement): 2 unbackticked path-shaped tokens rooted in our own tree, and
//      BOTH are grep artefacts rather than citations — "skills/_shared" is a Markdown H1
//      that happens to be a directory name, and "hooks/scripts" in README is English
//      prose meaning "hooks and scripts". They are quoted here WITHOUT backticks on
//      purpose: backticking them makes them real citations, and when this paragraph was
//      first written the gate FAILED on this very comment, naming the second token as a
//      citation that does not resolve. The documentation of a blind spot must not
//      manufacture one — twice over, since the first reword quoted the FAIL message
//      verbatim and re-introduced the backticks it was reporting. So the uncovered
//      population is 2 tokens and 0 real citations today. That is the cost, and it is
//      small because the house style already backticks paths — not because the gate
//      reaches them.
//
//   2. A SECTION AND A SYMBOL ARE NOT RESOLVED AT ALL. Not "the gate is path-only" — the
//      uncovered things are: a `file.md` §Heading whose heading has moved, and a
//      backticked identifier in a comment whose symbol has been renamed. Both were
//      measured and both flood (below); nothing checks them, and the pass line says so.
//
// ============================================================================
// WHAT IS NOT SHIPPED, AND THE MEASUREMENT THAT DECIDED IT. The dispatch asked for
// three resolvers — path, section, symbol. PATH is shipped. The other two were measured
// FIRST and both flood; shipping them would have been the cry-wolf gate this rule's own
// step-by-step exists to avoid.
//
//   SECTION ("the X section below", `file.md` §Heading):
//     - SELF-REFERENTIAL pointers are a population of FOUR across every .md and .mjs in
//       the tree, and all four resolve. A gate over four passing candidates buys nothing.
//     - Worse, the matcher cannot be made honest: run against CWK-059's own history
//       (`config-keys.mjs` at 04116d1 and 209689b) a "<token> ... below" rule reports
//       8 candidates and 6 DANGLING — and all six are false, because natural language
//       puts the wrong word next to "below" (`matches KEY_SHAPE below` is read as
//       "matches ... below"). 75% noise, 100% of it wrong.
//     - CROSS-FILE section refs are ~55 and the overwhelming majority target files that
//       do not exist here at all (`hooks-safety.md` §9, `skill-authoring.md` §3b live in
//       the umbrella). Resolving them is not this repo's job.
//
//   SYMBOL (a backticked identifier in our own code comments):
//     - 45 candidates, 37 resolve, 8 do not — 17.8% noise, AND ALL EIGHT FLAGS ARE
//       FALSE. Every one is a symbol named as a REJECTED ALTERNATIVE or an external
//       stdlib name the comment says we do NOT call (`renameSync`, `statSync`,
//       `appendFileSync`, `ignoreExclusions`, `disableFilters`). Discriminating "named
//       as the thing we use" from "named as the thing we rejected" is prose parsing, and
//       after such a filter the surviving population is all-resolving — a gate that
//       catches nothing.
//
//   So: partial coverage, STATED. Path is machine-checked; section and symbol are not
//   checked at all, by these numbers, and nobody should read this gate's green as
//   covering them.
//
// ============================================================================
// ADOPTER CONTRACT — DATA, never LOGIC. Six rooms reached six different verdicts on
// CWK-060's filter and this rule will fare no better, so nothing below hardcodes
// CoalMine's layout. A room supplies: its own surfaces (walked), its own ourRoots and
// ignoredRoots (derived from ITS tree), its own agentHomes (derived from whatever map
// that tool uses to write into a USER's tree — ours is scripts/lib/targets.mjs), its own
// hasEntry() and resolve(), and its own pending list. Every one of those is DATA read
// out of the adopting tree; none of them is a decision this module makes for a room.

// A path this room deliberately points at BEFORE it exists. Ships EMPTY, and the empty
// list is a MEASUREMENT, not an omission: every in-scope pointer resolves (67 of 67 at
// the CWK-075 r2 re-measurement), so nothing here has needed a declaration yet.
//
// The mechanism exists anyway, and that is a decision with a reason rather than padding:
// without an escape hatch the first legitimate forward pointer hard-FAILs, and the
// cheapest way to make a FAIL go away is to delete the gate. Same EVENT-based expiry as
// PENDING_KEYS/NOT_CONFIG — a declaration is pruned by what BECOMES TRUE, never by a
// date nobody re-reads.
export const PENDING_POINTERS = [
  // { path: 'scripts/lib/thing.mjs', reason: 'CWK-000 — landing next unit' },
];

const GLOB = /[*?[\]{}|]/;
const OUTSIDE = /^([~/]|[A-Za-z]:|[a-z][a-z0-9+.-]*:\/\/)/;
// A `.` or `..` SEGMENT -- never a dot-DIR like `.github`, which is a real name.
const DOTSEG = /(^|\/)\.\.?(\/|$)/;
// A BACKSLASH is not a separator this gate reads (CWK-075 r2 LOW-1). DOTSEG is
// segment-whole for `/`-delimited tokens and that property is untouched -- but it does
// not see a BACKSLASH-delimited segment, so `scripts/..\..\escape.md` survived every
// shape test, took the ourRoots branch on `scripts`, and path.resolve landed OUTSIDE
// the repo (measured). That is this room's own recorded lesson -- resolve-and-contain,
// not segment-scan, because a scan misses `\` on Windows -- reappearing inside the fix
// written to close a traversal hole.
//
// REJECTION rather than a wider separator class, and the reason is the lesson itself:
// widening DOTSEG keeps the segment-scan SHAPE and patches one miss, leaving the
// invariant platform-conditional. Rejecting the character makes it unconditional --
// A CITATION IN OUR SURFACES IS `/`-DELIMITED, on every platform, full stop -- and it
// closes more than the traversal case: `scripts\lib/x.mjs` (mixed) yields a first
// segment nothing matches, so it was SILENTLY skipped rather than dangerous. Half the
// class was quiet and half was live; now the whole class is out of scope uniformly.
//
// MEASURED before choosing: 9 backticked tokens contained a backslash and ZERO were
// path-shaped -- every one already dropped by another shape rule (whitespace, a glob
// metacharacter, or no `/` at all). So the rejection removed nothing that reaches the
// scope tests.
//   RE-MEASURED after this very paragraph was written: 13 tokens, of which TWO ARE
//   path-shaped -- and both are the worked examples two lines above, in this file. The
//   rule now has documentation, and its documentation is written in the syntax the rule
//   rejects. They are dropped by the BACKSLASH guard itself, so the conclusion is
//   unchanged and the population is self-referential; the numbers are re-derived rather
//   than left reading as a claim about ship-text they no longer describe.
//
// NAMED BLIND SPOT, not a denial: a legitimate WINDOWS-STYLE citation is now dropped,
// unchecked and unannounced. Measured population today: zero. If that ever stops being
// zero the right answer is to normalise separators at the boundary, never to re-admit
// the character into a segment scan.
const BACKSLASH = /\\/;

// Candidate extraction. Exported so an adopter can measure its OWN funnel with the
// same instrument rather than re-implementing it and getting different numbers.
export function pointerCandidates(text) {
  const out = [];
  // Fenced code blocks are EXAMPLES, not prose claims about this tree.
  const prose = String(text).replace(/^```[\s\S]*?^```/gm, '');
  for (const m of prose.matchAll(/`([^`\n]+)`/g)) {
    const tok = m[1];
    if (/\s/.test(tok)) continue;          // a command or a table row, not a pointer
    if (/[<>]/.test(tok)) continue;        // <placeholder>
    if (GLOB.test(tok)) continue;          // a glob names a SET, not a file
    if (!tok.includes('/')) continue;      // a bare filename is the USER's repo's
    if (OUTSIDE.test(tok)) continue;       // absolute, home-relative, or a URL
    if (DOTSEG.test(tok)) continue;        // `../` navigates, it does not NAME a path,
                                           // and it would also escape the repo on resolve
    if (BACKSLASH.test(tok)) continue;     // not a separator this gate reads -- see above
    // A DOT-DIR IS NO LONGER DROPPED HERE. It was, and that silently excluded four real
    // tracked files of ours (.claude-plugin/plugin.json, .githooks/, .github/workflows/ci.yml).
    // Whether a dot-dir is OURS or the scanned project's is TREE knowledge, not text shape,
    // so the decision moved to checkPointers where ourRoots and agentHomes exist.
    out.push(tok);
  }
  return out;
}

// `docs/x.md:12` and `scripts/` both name a real thing; the suffix and the trailing
// slash are punctuation, not part of the path.
function normalise(tok) {
  return tok.replace(/:\d+(-\d+)?$/, '').replace(/\/+$/, '');
}

export function checkPointers({
  surfaces = [],          // [{ label, text, historyOnly? }]
  ourRoots = new Set(),   // top-level names that belong to THIS repo
  ignoredRoots = new Set(), // top-level dirs this repo gitignores
  agentHomes = new Set(), // repo-relative install homes this tool writes INTO A USER's tree
  hasEntry = () => false, // (relDir, name) => boolean -- does `name` exist directly in relDir
  resolve,                // (relPath) => 'tracked' | 'untracked' | 'missing'
  pending = PENDING_POINTERS,
} = {}) {
  const findings = [];
  if (typeof resolve !== 'function') {
    findings.push({ level: 'FAIL', msg: 'pointer check: no resolve() supplied — the gate cannot answer its own question' });
    return findings;
  }

  const cited = new Set();
  let checked = 0;

  for (const s of surfaces) {
    if (typeof s.text !== 'string') {
      // NAME what could not be read. A caller that filters unreadable surfaces out
      // first hides its own scope gap — the silent narrowing this family of gates
      // exists to catch, committed by the gate's own wiring.
      findings.push({ level: 'SKIP', msg: `pointer check could not read ${s.label}` });
      continue;
    }
    const seen = new Set();
    for (const tok of pointerCandidates(s.text)) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      const first = tok.split('/')[0];

      // A GITIGNORED ROOT IS THE SHARP CASE, and it is decided WITHOUT resolving:
      // from any other machine "gitignored" and "does not exist" are indistinguishable,
      // so such a path was never durable — not even on the day it was written. That is
      // why this branch also binds a history-only surface, where the ordinary
      // resolution check does not: a renamed file was a correct citation once, a
      // scratchpad path never was.
      // NOTE this branch runs BEFORE `pending` is consulted, deliberately: a declaration
      // can excuse a path that does not exist YET, never one that exists and is
      // unreachable from a clone. A gitignored citation cannot be declared durable.
      if (ignoredRoots.has(first)) {
        cited.add(normalise(tok));
        checked++;
        findings.push({
          level: 'FAIL',
          msg: `${s.label} cites \`${tok}\`, which lives under the gitignored \`${first}/\` — not reachable from a clone. Cite the durable artefact (a commit SHA, a shipped doc) or commit the file.`,
        });
        continue;
      }

      // AN AGENT INSTALL HOME NAMES THE SCANNED PROJECT'S TREE, NEVER OURS -- and the two
      // genuinely collide: `.github/skills/` is Copilot's home while `.github/workflows/`
      // is ours, same root, opposite owner, indistinguishable from the token alone. The
      // set is DERIVED from the tool's own TARGETS map, never enumerated here, so it
      // cannot rot the day a vendor path changes.
      //
      // NAMED BOUND -- ROOT-LEVEL MASKING (CWK-078). This check matches on the FULL
      // path, but the caller's ignore probe holds out the agent-home ROOT, so a root
      // that is BOTH agent-home-named AND genuinely gitignored-and-ours would never be
      // probed, and a dead citation under it would go silently unchecked rather than
      // FAIL. Cost here is ZERO and the reason is structural, not luck: `.github` is
      // exactly that shape and it is TRACKED, so it never enters ignoredRoots by any
      // path. A room whose tree gitignores an agent-home root inherits the mask; that
      // is the bound, stated so the next reader does not have to rediscover it.
      const norm = normalise(tok);
      if (agentHomes.has(norm) || [...agentHomes].some((h) => norm.startsWith(h + '/'))) continue;

      // SCOPE, two independent tests, either sufficient -- and BOTH are structural, so
      // neither is circular. The old rule was repo-root only, which SILENTLY SKIPPED any
      // token whose first segment is not a top-level dir: `references/checks.md` cited
      // from its own skill dir was never checked at all. A skipped citation is the
      // quieter failure than a wrongly-flagged one, and it is the failure this whole
      // class is about.
      const citerDir = s.label.includes('/') ? s.label.slice(0, s.label.lastIndexOf('/')) : '';
      const parentDir = citerDir.includes('/') ? citerDir.slice(0, citerDir.lastIndexOf('/')) : '';
      let base = null;
      if (ourRoots.has(first)) base = '';
      else if (citerDir && hasEntry(citerDir, first)) base = citerDir;
      else if (parentDir && hasEntry(parentDir, first)) base = parentDir;
      if (base === null) continue;  // a path into someone else's tree
      cited.add(norm);

      // Published history is never fixed forward: a path that was correct when the
      // entry was written is not a defect now. Such a surface is checked for the
      // gitignored case above and nothing else.
      if (s.historyOnly) continue;

      checked++;
      const rel = base ? base + '/' + norm : norm;
      const state = resolve(rel);
      if (state === 'tracked') continue;
      if (pending.some((p) => p && p.path === rel)) continue;
      if (state === 'untracked') {
        findings.push({ level: 'FAIL', msg: `${s.label} cites \`${tok}\`, which exists here but is UNTRACKED — a clone does not have it. Commit it, or cite the durable artefact.` });
      } else {
        findings.push({ level: 'FAIL', msg: `${s.label} cites \`${tok}\`, which does not resolve in this repo` });
      }
    }
  }

  // EVENT-based expiry, both directions. A declaration list nobody prunes becomes a
  // permanent hole with an author's name on it.
  for (const p of pending) {
    if (!p || !p.path) { findings.push({ level: 'FAIL', msg: 'PENDING_POINTERS entry has no path' }); continue; }
    if (!p.reason) { findings.push({ level: 'FAIL', msg: `PENDING_POINTERS declares ${p.path} with no reason — an allowlist of bare strings is a bypass with no author` }); }
    if (resolve(p.path) === 'tracked') {
      findings.push({ level: 'FAIL', msg: `PENDING_POINTERS declares ${p.path} as not-yet-existing, but it now resolves — delete the entry` });
    } else if (!cited.has(p.path)) {
      findings.push({ level: 'FAIL', msg: `PENDING_POINTERS declares ${p.path}, but no in-scope surface cites it — delete the entry` });
    }
  }

  findings.checked = checked;
  return findings;
}
