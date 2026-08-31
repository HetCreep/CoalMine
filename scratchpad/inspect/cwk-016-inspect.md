# CWK-016 — INSPECT: `loop-design-check` adapt + `verification-report.md` residue + the zone-marker ruling

Reviewer: CoalMine code-reviewer (skill-holder). Read-only; nothing changed or installed.
Maker: CoalMine coder `994a1be4`. Build note: `CoalMine/scratchpad/cwk-016-build-note.md`.
Spec: my own `CoalMine/scratchpad/inspect/cwk-014-round2-inspect.md`, `loop-design-check` section.
Date: 2026-08-27.

---

## UNIT 1 — `loop-design-check/SKILL.md` — **FIX-NEEDED**

**All four adapts I specified landed and landed correctly.** The bounce is ONE item, and it is the item
the maker correctly escalated rather than decided: the dangling shared-partial markers (see the ruling
below). Everything else is SHIP-quality. Stating that plainly so the maker is not left guessing which
part failed.

### Adapt 1 — dead refs: widening from 1 site to 3 was RIGHT, and nothing live was cut
`grep -niE "autonomous-loops|continuous-agent-loop|continuous-"` → **ZERO survivors**. All three sites
swept: the body bullet, the closing Lineage footer, and the frontmatter `description:`.

The widening is not scope creep — it is the same defect class, and my CW-013 finding C-A1 already named
the class ("dead pointers train a reader to reach for levers that are not there"). Citing only one site
was my under-count, not the maker's over-reach; a half-swept dead reference is the worse outcome.

**The `description:` edit is SAFE — checked specifically, because that field is user-facing.**
- **Length: 936 chars, under the 1024 flock lock.** ✔ (measured with `.length` on the parsed field, not
  `wc -c`.)
- The scope boundary SURVIVED the pointer removal: *"Covers the judgment layer only — how to wire the
  loop mechanism itself is out of scope."* The boundary is the load-bearing half; the destination was
  the dead half. Cutting the destination and keeping the boundary is exactly right — a reader is still
  told where the skill stops, just not sent somewhere that does not exist.
- **Trigger surface intact**, both lanes: the Chinese trigger list (`写 loop`, `检查 loop 对不对`,
  `可判定目标`, `五个崩法`, `plan build judge`) and the English one (`design an agent loop`, `loop review`,
  `prevent a runaway loop`, `decidable goal`) are untouched. No trigger was collateral damage.
- Both actions and the five-failure-mode promise are still named in the description, so what the harness
  offers still matches what the body delivers.

### Adapt 2 — the `:121`→`:125` coverage re-frame: **the cure took, and it survives a hostile read**
Now reads: *"coverage does not regress against the prior run"* + *"(Coverage here is a **delta check
against its own prior value**, never a numeric floor — coverage stays a diagnostic, not a gate.)"*

Hostile read attempted, three angles:
1. **Is there a number to clear?** No. There is no threshold anywhere in the sentence. Compare what I cut
   from `verification-loop:56`: `# Target: 80% minimum` — a literal number, in a code block, presented as
   a pass condition. That is a floor. "Does not regress against its own prior value" is a *relative*
   predicate with no absolute bar; a project at 12% coverage passes it as readily as one at 95%.
2. **Could a reader still infer a bar?** The parenthetical forecloses it in the same breath — "never a
   numeric floor", "a diagnostic, not a gate" — using `testing.md`'s own vocabulary. A reader would have
   to read past an explicit denial to get there.
3. **The one residual, named honestly rather than waved off:** the clause does sit inside a *decidable
   goal* — i.e. it IS a pass/fail acceptance condition in that worked example's loop. That is not a
   `testing.md` collision: the rule bans blocking on a **percentage** ("NOTHING blocks on a percentage"),
   and a no-regression delta is not one. It is also someone else's loop goal in a worked example, not
   this house's gate policy. But the tension is real enough to name, and the parenthetical is what keeps
   it on the right side of the line — do not let a future lean pass cut that parenthetical as "obvious".

### Adapt 3 — MAKE→GATE: **additive is CORRECT here, and replacing would have been the error**
The maker added a `>` blockquote (`:89`) beside the existing Plan/Build/Judge table (`:83-85`) and its
three iron rules (`:87`), rather than renaming the table's roles.

The chair's worry — two vocabularies for one thing — does not apply, because they are **not one thing at
one scale**:
- Plan/Build/Judge describes a **loop control structure inside a single task** (a runtime architecture).
- MAKE→GATE describes **our org topology across seats** (stations, dispatch, bounce routing).

They are the same *shape* at two different scales, and the blockquote states a MAPPING ("Build is the
MAKER, Judge is the GATE"), not a synonym list. That is the right move for two reasons: it lets a reader
who knows our belt recognise the pattern instantly, and it leaves the third-party design pattern
describable in its own terms. **Replacing the table would have been worse** — the skill would then read
as a description of our org chart rather than of a loop, and a reader designing an actual loop would
have lost the vocabulary the rest of the literature uses.

Two vocabularies would only be a defect if BOTH were used as routing instructions. They are not: the
table's terms name loop roles; only ours carries the routing rule (pass = forward, fail = bounce to the
MAKER, never patched by the gate, never escalated past the dispatcher).

### Adapt 4 — the judgment layer SURVIVED intact
This is the reason the skill earned its verdict, so I checked it directly rather than trusting the
"English pass made no changes" claim. All five failure modes are present and still sharp:
- `:107` #1 — goal is a correct platitude → **spins, burns money**
- `:109` #3 — gates only on "all tests pass" → **agent deletes the tests** (the Goodhart case, stated at
  its most concrete)
- `:110` #4 — counts on the agent asking mid-run → **it runs the wrong answer to the end**
- `:55` — boundary conditions alongside the done-criterion, explicitly labelled anti-Goodhart
- `:93` — damping / the Ralph-Wiggum oscillation
- `:87` — the three iron rules, including "the judge must be independent — not the same agent as Build
  (grading your own homework always inflates)", which is our own maker/gate split arrived at
  independently upstream
- `:124` worked example — "Naive goal: 'make all tests pass' → this is the bait for failure mode #3"

Nothing sanded. The maker's claim that it made no cosmetic wording changes is consistent with what is on
disk, and declining to manufacture busywork edits was the right call.

### Adapt 5 — CLASSIFY-BLOCK: correct shape
One `read` row, no write/spawn/network rows. **Correct, not lazy** — the skill is prose-only judgment
guidance with no write, spawn, or fetch step, and §5b asks for the classes the skill actually has. Adding
three empty rows for symmetry is the padding my CW-013 record already ruled against. The on-denial cell
is properly specific: *"refuse the review — say which file was unreadable and stop there, never guess at
a design you couldn't read."*

---

## UNIT 2 — `verification-report.md` provenance paragraph — **SHIP**

**TRUE, verified at source.** The new sentence claims the staged copy was deleted: `ls
.claude/skills-intake/` returns six directories (the round-2 set) and
`ls -d .claude/skills-intake/verification-loop` returns *"No such file or directory"*. The claim matches
disk.

**Smallest true edit.** It repairs the false clause (a live-directory citation) and adds only what makes
the new state legible — *"the staged copy then DELETED deliberately: this rule replaces it, so no live
directory backs that provenance any more."* It does not re-litigate the distillation decision, which was
already gated.

**Rest of the file untouched.** Same three sections (`## When to use`, `## The shape`, `## Deliberately
left out, and why`); 59 lines vs 57 pre-edit, +2 accounted for entirely by the rewritten paragraph. The
gated-SHIP body is intact.

**NOTE, cosmetic, not a bounce:** the rewrite left a ragged short line — `That skill's six phases each`
on its own line at `:6`, an artifact of splicing into a wrapped paragraph. Renders fine in Markdown
(soft wrap), reads oddly in the raw file. Worth a one-second fix on whatever touches this file next; not
worth a round trip on its own.

---

## THE RULING — zone-install shared markers, for BOTH files

### 1. Does the zone home render `SHARED:` markers? **NO. Measured, four ways.**

My CWK-014 caveat was right, and both files carry a dangling HTML comment today.

**Method — a shipped-elsewhere assumption is not a measurement, so here is what I actually ran:**

1. **Who resolves the markers, anywhere in the tree?**
   `grep -rln "SHARED:CLASSIFY_BLOCK|shared\.classifyBlock|SHARED:LANGUAGE_HEADER" --include=*.mjs
   --include=*.js --include=*.json .` over all of `CoalWorks/` → **exactly three files**, every one under
   `CoalMine/scripts/`: `lib/render.mjs`, `lib/render.test.mjs`, `verify.mjs`.
2. **Can those three reach the zone dir?** No — their roots are hard-coded to CoalMine's own repo.
   `build-plugin.mjs:23-28`: `skillsSrc = path.join(repo, 'skills')` · `pluginDir = path.join(repo,
   'plugin')` · `loadShared(path.join(skillsSrc, '_shared'))`. Neither accepts an arbitrary root, and a
   grep of `CoalMine/scripts/` for the zone path returns nothing that targets it (`install.mjs`'s
   `.claude/skills` hits are the GLOBAL `~/.claude/skills` and a Cline target — and it writes *resolved*
   output rendered from CoalMine's own source; it never scans a foreign directory for markers).
3. **Is there a zone-level renderer or partial source?** No. `ls CoalWorks/.claude/` →
   `agent-memory/ coalwash/ rules/ skills/ skills-intake/`. No `_shared/`, no `classify-block.md`, no
   `.mjs`, no `package.json`, no build script at CoalWorks root.
4. **The structural fact that settles it independent of our tooling:** a project-level
   `.claude/skills/<name>/SKILL.md` is read **verbatim** by the platform — there is no build step between
   disk and model. Main's own re-measurement is the confirming evidence *for* this, not against it: the
   skill is discovered and invocable **as written**, markers and all.

**What would settle it the other way** (stating it so this is falsifiable, not just asserted): a build or
sync step whose input root is `CoalWorks/.claude/skills/` and which writes resolved output back — or a
zone-level `_shared/` with a renderer that runs before invocation. Neither exists. If one is ever added,
this ruling reverses and the inline copies become the drift risk instead.

### 2. Disposition: **BOTH — FIX-NEEDED on this unit AND a separate ticket on the installed sibling**

- **This unit (`loop-design-check`, not yet installed): FIX-NEEDED.** It is pre-install, which is the
  cheapest possible moment; installing it as-is would knowingly ship a second copy of a defect we have
  already identified.
- **`agent-introspection-debugging` (already installed at `.claude/skills/`): a separate ticket.** It is
  live, and changing an installed skill is the chair's press, not the maker's — and it is a different
  unit from the one I am gating. Carrying a fix ticket is the right call over leaving a quietly broken
  section, exactly as the chair framed it.

### 3. What must be inlined — and it is TWO partials, not one

**This is a finding beyond the chair's question, and it applies to the installed sibling too.**

**(a) `CLASSIFY_BLOCK`** — replace `<!-- SHARED:CLASSIFY_BLOCK -->` with the literal 10 lines of
`CoalMine/skills/_shared/classify-block.md`:

```
A denial reaches the WORKER as a visible message and propagates no further — never to a
caller, never as a catchable condition. Every row above states a grant or an explicit death;
a step that dies says so in the output, never as a false "done"/"skipped"/"clean".

- **read** denied → refuse before scanning; never a false clean bill.
- **write** denied → report the change as NOT applied — never claim done.
- **network** denied/unfetchable → `⚠️ unverified: check [source]`.
- **spawn** denied → degrade per Escalation's own capability-lever fallback (never fake
  parallelism) and say the fan-out did not happen — already discharged there; a row above
  is only for a spawn this skill does OUTSIDE tier escalation.
```

*Failure scenario if left dangling:* the section renders as a heading plus a table, reading complete,
while §5b's core clause — a denial propagates no further, and a dead step must say so rather than report
a false "done" — is absent. The per-row `on denial` cells do not carry it: they state what THIS skill
does, never the propagation property. For `agent-introspection-debugging` the loss is larger still, since
its table has read+write rows while the partial supplies the network and spawn idioms it does not.

**(b) `LANGUAGE_HEADER` — the same defect, and nobody has flagged it.** Both files carry
`<!-- SHARED:LANGUAGE_HEADER -->` un-rendered (`loop-design-check` at the line after its title;
`agent-introspection-debugging/SKILL.md:8`). Replace with the literal line from
`CoalMine/skills/_shared/language-header.md`:

```
**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).
```

*Failure scenario:* this is a genuine behavioural rail, not decoration — CoalMine's own Rule 3 makes
adaptive language non-negotiable, and this house writes Thai. A zone skill with a dangling marker here
has NO language instruction at all and will default to English, which is the exact failure Rule 3 exists
to prevent. **Arguably more urgent than (a)**, because (a) degrades a discipline while (b) changes what
the user actually sees on every invocation.

### 4. The honest residual of inlining, stated rather than hidden
Inlining creates a COPY that can drift from `CoalMine/skills/_shared/*`, and **no gate covers it**:
CoalMine's marker-presence check and shared-region byte-compare are both scoped to `CoalMine/skills/**`
and `plugin/**`, so a zone copy is unguarded by construction. Mitigation: each inlined block carries a
one-line provenance comment naming its source of truth (`CoalMine/skills/_shared/<file>.md`) so a future
reader knows where to re-sync from. A drifting copy is a real cost; a dangling marker is strictly worse,
because it fails silently while a drifted copy at least still says something.

---

## PENDING OWNER / CHAIR DECISIONS (returned, not answered)

- **CHAIR-1 — the fix ticket against the already-installed `agent-introspection-debugging`.** Two
  partials to inline (`CLASSIFY_BLOCK` at `:151`, `LANGUAGE_HEADER` at `:8`). It is live; the press is
  the chair's.
- **CHAIR-2 — the installed sibling also still carries the maker's original "install-time note"**
  (immediately after `:151`) saying the destination is *"undecided at intake time"* and *"if it installs
  zone-level … state it in the installing room's own CHANGELOG/MEMORY"*. The destination is now decided
  and the install has happened, so that paragraph is stale on two counts. Fold it into CHAIR-1 rather
  than leaving a note that describes a decision already taken.
- **OWNER-1 — should the zone acquire a `_shared/` + a render step at all?** Inlining is right for two
  skills; if the zone grows to five or six, hand-maintained copies become the drift surface this flock
  has a named rule against. Not urgent, and explicitly not mine to decide.
- **OWNER-2 (carried, still unanswered from CWK-014)** — `allow_implicit_invocation: true` in the intake
  skills' `agents/openai.yaml`. `loop-design-check` was in the round-2 set the chair reported as
  0 self-firing yaml, so it may not apply here; the question stands for the set.

## Gates
Not run, and none owed: nothing here stages code into any room's `plugin/`, changes any dist, or touches
a gated surface. Same disposition as CW-013, CWK-014, and CWK-016's own build.
