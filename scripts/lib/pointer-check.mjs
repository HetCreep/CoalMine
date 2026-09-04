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
//   step                                              occurrences  distinct
//   0  every backticked token in prose                    807         517
//   1  path-shaped (has `/`, or a file extension)         260         149
//   2  no whitespace                                      218         112
//   3  no `<placeholder>` angle brackets                  207         105
//   4  no glob metacharacters                             202         102
//   5  has a DIRECTORY component                          140          72
//   6  not absolute / `~` / a URL                         107          57
//   7  first segment is not a dot-dir                      72          40
//   8  first segment is one of OURS                        67          35
//
//   Final: 52 distinct (token, citer) candidates, 52 resolve, 0 non-resolving.
//   Re-derive with the walk in verify.mjs 2.11; never quote these numbers forward.
//
//   THE GATE'S OWN PASS LINE REPORTS A SMALLER NUMBER, and the delta is the rule, not
//   drift: this funnel also resolved a token relative to its CITER's directory and its
//   parent, the shipped gate is repo-root-anchored only (step 8 IS the in-scope test).
//   A token like `references/checks.md`, which resolves beside its citer, is therefore
//   measured here and NOT checked there -- narrower, and stated rather than silently
//   narrowed.
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
// NAMED BLIND SPOT, so a clean run is never read as coverage: step 7 excludes EVERY
// dot-dir, including `.github/` — which IS tracked here. A shipped doc citing
// `.github/workflows/ci.yml` in our own tree goes unchecked. Measured cost today: zero
// (the only `.github` citation in scope is `.github/skills/`, a USER-tree path). The
// day a shipped surface cites our own `.github`, this rule must be revisited, and that
// is prose, not a machine.
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
// ignoredRoots (derived from ITS tree), its own resolve(), and its own pending list.

// A path this room deliberately points at BEFORE it exists. Ships EMPTY, and the empty
// list is a MEASUREMENT, not an omission: at the time this gate was built, 52 of 52
// in-scope pointers resolved, so nothing here needed a declaration.
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
    if (tok.startsWith('.')) continue;     // a dot-dir is an agent/tool home
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

      if (!ourRoots.has(first)) continue;  // a path into someone else's tree
      cited.add(normalise(tok));

      // Published history is never fixed forward: a path that was correct when the
      // entry was written is not a defect now. Such a surface is checked for the
      // gitignored case above and nothing else.
      if (s.historyOnly) continue;

      checked++;
      const rel = normalise(tok);
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
