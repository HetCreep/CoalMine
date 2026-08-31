# CWK-014 (c) — INSPECT, six round-2 arrivals

Reviewer: CoalMine code-reviewer (skill-holder). Read-only; nothing changed, installed, or defused.
Source: `CoalWorks/.claude/skills-intake/`, verbatim upstream ECC `d8409a4`. SUSPECT INPUT.
Nothing installs this round — INSTALL verdicts are recommendations to main.
Date: 2026-08-27.

## Verdict table

| skill | lines | verdict | decisive reason |
|---|---|---|---|
| `loop-design-check` | 143 | **INSTALL-with-adapt-list** | Prose-only, zero executable, and the loop-failure judgment layer (spin · Goodhart the verifier · run a wrong answer to completion) is genuinely absent from every Coal* tool. |
| `automation-audit-ops` | 143 | **PARK** | Its workflow is built on a 6-skill "Skill Stack", **5 of which do not exist here** — cut them and what the workflow actually *is* becomes undefined. |
| `rules-distill` | 265 | **PARK** | The capability is real and NOT gold-standard drift (see below) — but 265 lines + 2 `.sh` + a paid LLM phase is a second ruleset-writer; extract the direction, do not install the product. |
| `dynamic-workflow-mode` | 124 | **PARK** | Control Pane is not an ignorable mention (8 refs + its own section); it prescribes a state board that overlaps the harness task board and the belt's station reporting. Its useful half restates `skill-authoring.md` §5. |
| `delivery-gate` | 126 | **REJECT** | `sys.exit(2)` from a Claude Code Stop hook is **not legal for us** — see the legality answer below. Port question moot. |
| `skill-comply` | 59 | **REFERENCE-FOR-REBUILD** | (No INSTALL available by the chair's own constraint.) Capability is worth real money; the code is not portable. |

---

## THE `delivery-gate` LEGALITY ANSWER — asked first, answered on its own terms

**NO. `exit 2` is not legal for a Claude Code Stop hook in this house, and we already ship the legal
alternative.** Three independent grounds, each sufficient:

1. **`hooks-safety.md:21`** — the §1.0 table's Claude Code row. The *mechanism* column documents
   `exit 2 = BLOCK` as the platform's behaviour; the **discipline** column — what OUR hooks do — reads
   **"FAIL SILENT, exit 0"**. The table describes the host; the discipline binds us.
2. **`hooks-safety.md:23`** — *"Phoenix #4's 'never set a non-zero exit code' binds the last two rows
   ONLY."* The last two rows are git `post-*` and **Claude Code hooks**. So Phoenix #4 binds this exact
   surface by name. `quality-gate.py` calls `sys.exit(2)` at `:155`, `:210`, `:214` — three violations.
3. **We already have the sanctioned mechanism, and it is strictly better.** Our own
   `CoalMine/hooks/rot-canary-stop.js:740` blocks a Stop with `out.decision = 'block'; out.reason = …`
   emitted as JSON **on exit 0** — the channel Phoenix #13 names as sanctioned. §1.0 also says
   *"JSON parsed ONLY on exit 0"*, so exit 2 **throws the structured `reason` away**: the platform gets
   a bare block with no message. Choosing exit 2 would be a downgrade even if it were permitted.

Because the answer is no, the Python→node port question is moot and I did not evaluate it. (For the
record: `python3` IS on PATH here, so the port was not blocked by runtime absence — it is blocked by
the exit contract.)

### CORRECTION — both the chair's framing and the INTAKE-NOTE are wrong about what this hook blocks on
Both say it "BLOCKS on rationalization language". **It does not.** `quality-gate.py:167-174`: the
rationalization regex loop only calls `log.warning(...)` and never exits. The SKILL.md's own table says
so in its own words — *"Rationalization patterns | Regex on transcript tail | **Warning only (never
blocks)**"* — and explains why: *"It never blocks on its own, because regex heuristics can
false-positive."* Upstream already made exactly the call our own cry-wolf rule would have demanded.

So the false-positive cost the chair asked me to weigh **does not attach to the language matcher**. What
actually exits 2 is: disk < 15GB (`:155`), ≥3 stale learning libs (`:210`), and stale `growth-log`
(`:214`). That relocates the real objection, and it is worse than the one predicted:

- **The blocking conditions are upstream's personal memory taxonomy.** `LIBS` (`:29-35`) names
  `ratings-tracker.md`, `decisions/log.md`, `growth-log/`, `output-index.md`,
  `tooling_capabilities.md`. **None exists in this house.** Every one would be permanently "stale", so
  a complex session (≥3 edits) would block **every time** — a gate that fires on compliant work, which
  is precisely the cry-wolf failure our own rules name.
- **Blocking a turn on DISK SPACE** is a machine-state gate we have no rule for and no consent path to.
- **Phoenix #13 (Zero Noise) violated on the happy path**: `logging.basicConfig(stream=sys.stderr,
  level=INFO)` plus `log.info('Looking for memory dir: …')` at `:60` writes to stderr on **every**
  invocation, including the silent path.
- **Phoenix #8 (deterministic)**: `datetime.date.today()` (`:85`) makes the stale check branch on
  wall-clock date — time-based branching outside a timestamp stamp.
- **`hooks-safety.md` §8 (phantom-slug law)**: `:57-59` builds `~/.claude/projects/<mangled-cwd>/memory`
  by string-replacing `:` `\` `/`. That is the exact slug-derivation hazard §8 exists for.

**Salvage, named so the idea is not lost with the artifact:** the one piece that maps to our doctrine is
mechanizing `AGENTS.md`'s banned-rationalization list ("a sub would be slower", "small verified fix",
"batch momentum", "verify-first"). That is ~30 lines of node inside our **existing** `rot-canary-stop.js`,
emitted on the `systemMessage` channel as an advisory — never a block, matching upstream's own reasoning
about regex false-positives and our own memory-drift-nudge precedent. Nothing needs porting to get it.

---

## `rules-distill` vs `gold-standard` — the comparison the chair asked for, answered concretely

**It is NOT drift. Say that plainly before parking it.** The two run in opposite directions:

- `gold-standard` asks *"what does the world do that we don't?"* Its input is EXTERNAL exemplars, and its
  own **P11** requires every criterion to cite a real exemplar ("npm does X, Cargo does Y").
- `rules-distill` asks *"what are WE already doing repeatedly that nobody ever wrote down?"* Its input is
  OUR OWN installed skill bodies; it mines principles recurring across them and assigns a per-candidate
  verdict (Append / Revise / New Section / New File / Already Covered / Too Specific).

**gold-standard structurally cannot find that second class** — an unwritten internal pattern has no
external exemplar, so P11 rejects it before it can be scored. That is a genuine, non-overlapping gap, and
it is adjacent to a defect this org keeps paying for (a practice followed in every room but written down
in none, surfacing later as an unnamed divergence).

**So why PARK rather than INSTALL:**
- **265 lines** — larger than every skill this room ships except `gold-standard` itself.
- **Two `.sh` scripts** (`scan-rules.sh`, `scan-skills.sh`). Our shipped tooling lane is `.mjs`
  (`node/runtime.md` §3: `scripts/**` = ESM `.mjs`). A `.sh` inside a skill's `scripts/` is a new
  precedent, not a port.
- **A paid LLM-judgment phase** (Phase 2) with no consent gate stated — collides with the consent-gate
  law ("a silent expensive op = theft, not a feature").
- **Its Phase-3 per-candidate approval gate duplicates `gold-standard`'s G-ledger.** Installing both
  gives the room two different approval vocabularies for the same act (writing a rule).

**The CWK-013 lesson applies exactly:** the value is the DIRECTION (skill-vs-skill principle mining), not
the 265-line product. The proportionate move is a new `gold-standard` ACT — or a `references/` procedure
— that reuses the existing G-ledger for approval, rather than a second ruleset-writer with its own gates.
That is an owner call, hence PARK, not REJECT. Its "never auto-write" gate is worth keeping verbatim
whichever shape wins.

---

## Per-skill adapt lists (for the one INSTALL, and the parked ones if they are ever revived)

### `loop-design-check` — INSTALL-with-adapt-list
The INTAKE-NOTE calls this "the strongest install candidate". **Here the note is right**, and I say so
having corrected it twice elsewhere in this pass.
1. **CUT `:21`** — points at `autonomous-loops` / `continuous-*` for the mechanism layer. Measured absent
   (same dead-pointer class as CW-013's C-A1). Cut, or make conditional.
2. **REWRITE `:121`** — the worked example's decidable goal includes *"coverage not lowered"*. As written
   it is a **delta** check, not a percentage floor, so it does not strictly collide with `testing.md`'s
   "NOTHING blocks on a percentage" — but it sits one word from doing so. Re-frame it explicitly as a
   no-regression delta with coverage named a diagnostic, so a reader cannot take it as a gate.
3. **REWRITE** — point its judge/verifier vocabulary at **MAKE→GATE** and the maker/gate split, so the
   "Goodhart-gaming the verifier" failure mode lands on our own topology (the gate never patches; a fail
   bounces to the MAKER).
4. **ADD** — `## Grants & denials (CLASSIFY-BLOCK)` per `skill-authoring.md` §5b (MUST for a new skill).
   This one is nearly free: the skill is prose-only, so it is a read row and nothing else.
5. **ADD** — `<!-- SHARED:LANGUAGE_HEADER -->` if it installs into a room with a render pipeline
   (9 of 9 room skills carry it, no exception — same ruling as CWK-014(a)'s ADD-A2).

### `automation-audit-ops` — PARK
- **Skill Stack `:16-23`** instructs "pull these ECC-native skills into the workflow": `workspace-surface-audit`,
  `knowledge-ops`, `github-ops`, `ecc-tools-cost-audit`, `research-ops`, `verification-loop`. **Five do not
  exist here**, and the sixth is the one main just declined to install. The workflow's own spine is
  missing; this is CW-013's C-A1 class at 6× scale and the note does not mention it.
- Its domain is largely a surface we do not run: webhook fanout, queued jobs, billing burn in a sibling
  app repo, MCP connectors. What we actually have is hooks + CI + Dependabot + cron — a much smaller set
  already visible without a skill.
- ECC-identity prose is load-bearing, not cosmetic (`:105` "one canonical ECC lane", `:29` "inside ECC").
- **The note's own adapt item is aimed at nothing:** *"swap any gh-CLI mention to REST"* — `gh` appears
  **0 times** in the file (grep count 0). Same shape as the `/compact` miss in CW-013.

### `dynamic-workflow-mode` — PARK
- **`## Control Pane Checkpoints` (`:83-94`)** — the note says "ignore its 'ECC control pane' mention".
  It is not a mention: **8 occurrences plus a dedicated section**, and the section prescribes a
  Plan/Queue/Run/Gate/Handoff state board. That is not ignorable content; it either maps or it is cut.
- Mapping it **collides** rather than complements: we already have the harness task board (session-scoped,
  and orphaned three times on record) and the belt's own station reporting. A third state vocabulary is
  drift.
- Its genuinely useful half — the inline vs task-harness vs promote-to-skill decision tree (`:29-36`) and
  Shared Skill Extraction (`:71-82`) — is small, and largely restates `skill-authoring.md` §5's extraction
  discipline. Same "is it one table, not a skill?" question CWK-013 settled for `verification-loop`.

---

## `skill-comply` — what OUR version would have to be

**The capability is worth real money and the aim is right:** `AGENTS.md` names an unmechanized
FOURTH-TENSE gap a dozen-plus times, always with the same shape — *"nothing mechanical checks this; it is
prose."* A tool that measures adherence mechanically is the missing organ.

**Not portable (must be re-invented, not adapted):**
- `pyproject.toml` + `uv` + the whole `scripts/*.py` tree — Phoenix #2 (zero-dep) and our `.mjs` lane.
- **The paid LLM classifier** (`scripts/classifier.py` + `prompts/classifier.md`) — Phoenix #7 (offline)
  and the consent-gate law. A per-run paid classification that fires without a press is exactly the
  silent expensive op the rule forbids.
- Its scenario/spec generators — they presuppose generating synthetic runs; we already have real ones.

**Portable (the SHAPE, worth copying deliberately):**
- The pipeline: **parse a trace → grade against a spec → report**, with parser/grader/report as separable
  units (their `test_parser` / `test_grader` / `test_runner` split is the right seam and maps cleanly onto
  `node:test`).
- **`fixtures/compliant_trace.jsonl` + `noncompliant_trace.jsonl` as a red/green control PAIR.** This is
  the single most valuable thing in the directory: it makes the grader's own non-vacuity provable, which
  is this room's standing bar for any new gate.
- A declarative spec file (`tdd_spec.yaml`) as the rule-under-test, so a new rail is added as data rather
  than code.

**What ours must be, concretely:**
1. `.mjs`, zero-dep, `node:test`-gradeable, no network, deterministic.
2. **Input = traces we already produce** — `claude -p --output-format json` returns, room gate output,
   `git log` — never a paid synthetic re-run.
3. **Deterministic rails FIRST, and it must EXTEND what we already ship rather than start fresh.** We
   already mechanically check three: `checkRuleStamps` (stamp well-formedness + `paths:` glob shape), the
   `SHARED:CLASSIFY_BLOCK` presence gate, and `checkDoctrineMirrors` (byte-identical rule trees). The
   greppable fourth-tense rails waiting for an owner are named across our own rules — the line-anchored
   `RULES_VERSION last synced: N` marker contract, the `keeps.json` user-naming trigger `AGENTS.md`
   itself calls *"greppable today … the absence is a choice nobody has made deliberately"*, and the
   `"type": "command"` hook census.
4. **The LLM-judgment half, if ever built, is consent-gated per NO STATION CONSUMES A CONSENT ASK, never
   auto-fired, and never the only evidence for a verdict.**
5. **It must ship the red/green fixture pair** and prove the grader red before green — our own standing
   discipline, and upstream already models it.
6. **Honest ceiling, stated in the tool's own text:** it can only measure rails that are mechanically
   decidable. Most of `AGENTS.md`'s fourth-tense gaps are prose about judgment and stay prose. Ours
   closes the greppable subset and must SAY which gaps remain unmeasured — otherwise it manufactures the
   false-coverage this room has been bitten by repeatedly. That makes ours smaller than upstream's
   ambition, and honest where upstream is aspirational.

---

## WHERE THE INTAKE-NOTE (AND THE DISPATCH) WERE WRONG

1. **"delivery-gate … BLOCKS on rationalization language"** — note *and* chair. It warns only, by
   upstream's explicit design. The real blocks are disk and stale personal memory libs.
2. **"swap any gh-CLI mention to REST"** (automation-audit-ops) — `gh` appears **0 times**.
3. **"ignore its 'ECC control pane' mention"** (dynamic-workflow-mode) — 8 occurrences and a dedicated
   section, not a mention.
4. **"complements gold-standard"** (rules-distill) — the note is *right about the direction* and I
   confirm it; what it omits is the cost (265 lines, 2 `.sh`, a paid phase, a duplicate approval gate),
   which is what actually decides the verdict.
5. **"strongest install candidate"** (loop-design-check) — **correct**, recorded because the note has been
   wrong three times above and should get credit where it is right.

## PENDING OWNER DECISIONS (returned, not answered)

- **OWNER-1 — `loop-design-check` install destination** (room vs zone), which decides the shared-marker
  set exactly as in CWK-014(a). My ADD-A2 ruling from that unit transfers unchanged.
- **OWNER-2 — `rules-distill`: which shape?** (a) a new `gold-standard` ACT reusing its G-ledger;
  (b) a `references/` procedure under `gold-standard`; (c) install as its own skill and accept two
  approval vocabularies; (d) drop the capability. My read favours (a) or (b); the call is not mine.
- **OWNER-3 — `skill-comply` rebuild: authorize or defer?** It is a build, not an install, and it needs a
  room and a scope before anyone starts. If authorized, item 3 above (extend the existing three gates
  rather than start fresh) should be a rail in the dispatch.
- **OWNER-4 — the banned-rationalization advisory salvaged from `delivery-gate`.** ~30 lines inside the
  existing `rot-canary-stop.js` on the `systemMessage` channel, advisory-only. Worth doing separately
  from any intake decision; needs a press because it changes a shipped hook.
- **OWNER-5 — disposition of the four PARK/REJECT staged copies.** Deleting staged directories is the
  chair's press, not mine.

## Gates
Not run, and none owed: nothing here stages code into any room, changes any dist, or touches a gated
surface. Same disposition as CW-013 and CWK-014(a)/(b).
