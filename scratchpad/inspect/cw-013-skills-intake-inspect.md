# CW-013 INSPECT — skills-intake (verification-loop, agent-introspection-debugging)

Reviewer: CoalMine code-reviewer (skill-holder, FLOW v2 rail 5). Read-only; nothing staged was modified.
Source: `CoalWorks/.claude/skills-intake/`, verbatim from upstream ECC HEAD `d8409a4`. SUSPECT INPUT.
Date: 2026-08-27.

## Ground truth measured before judging (not inherited from the note or the dispatch)

| probe | result |
|---|---|
| `continuous-learning-v2` / `council` / `workspace-surface-audit` exist in flock | **0 / 0 / 0** |
| `/verify` command exists anywhere | **0** |
| `.ts` / `.tsx` files in CoalWorks | **0** |
| `package.json` in CoalWorks (depth 3) | **0** |
| `npm` on PATH | present (but no `package.json` for it to act on) |
| `pnpm` / `tsc` / `pyright` / `ruff` on PATH | **ABSENT / ABSENT / ABSENT / ABSENT** |
| `/compact`, `/clear`, restart, fresh-session instruction in either SKILL.md | **ZERO** |

## CORRECTION TO THE DISPATCH'S OWN FRAMING (asked for, and it matters)

The chief named one collision in advance: a step telling an agent to `/compact`, `/clear`, restart, or
start a fresh session on context grounds. **That step does not exist in either file.** Grepped
`/compact|/clear|restart|fresh session|new session|reset agent` across both SKILL.md — one hit, and it
runs the OTHER way:

`agent-introspection-debugging/SKILL.md:90` — "Do not claim unsupported auto-healing actions like
'reset agent state' or 'update harness config' unless you are actually doing them through real tools
in the current environment."

That sentence is ALIGNED with our permanent ruling and with the `/compact`-is-unreachable finding. It is
the strongest line in the file and should survive install untouched.

What IS there is a weaker adjacent pair (REWRITE-A1/A2 below). Reporting the miss rather than
manufacturing a CUT to match the prediction.

---

## SKILL 1 — `agent-introspection-debugging`

### VERDICT: PASS-with-adapt-list
Genuinely fills a gap the org has nothing in; content is largely stack-agnostic; its own worst instinct
(claiming auto-healing it cannot do) is already self-policed at `:90`.

### CUT
- **C-A1 · `:139-142`** — Integration block cross-references four skills; **three do not exist in this
  flock** (`continuous-learning-v2`, `council`, `workspace-surface-audit` — measured 0/0/0). Dead
  pointers train a reader to reach for levers that are not there, the same class as `/compact`.
  `verification-loop` (`:139`) becomes valid only if that sibling also installs — make it conditional.

### REWRITE
- **REWRITE-A1 · `:84`** — "trim low-signal context and keep only the active goal, blockers, and
  evidence". For a **sid-resident this is inoperable**: no tool trims an agent's own context window, and
  compaction is not a lever we hold. As written it invites exactly the manual context-management our
  2026-08-05 ruling makes permanently forbidden.
  Should say: *"stop ADDING low-signal bulk — restate the goal compactly going forward and stop pasting
  whole logs. Never attempt to clear, compact, or re-birth a resident session on context grounds: a
  resident compacts on its own and the warm transcript IS the experience. This bullet is about what you
  emit next, never about the window you already have."*
- **REWRITE-A2 · `:66`** — diagnosis row "Context overflow / degraded reasoning". Correct as a *leaf*
  observation, dangerous as a resident one: our ruling says a "context low" warning is NORMAL,
  informational, **never a trigger**. Add a scope clause: *"applies to a single-use Agent-tool leaf's own
  emitted bulk (a leaf never renews). For a sid-resident, occupancy is a point in a compaction cycle,
  not a failure — do not act on it."*
- **REWRITE-A3 · `:102-116`** — Phase 4 ends with a chat report. Collides with `subagent-safety.md`
  rule 6 (disk-first): a return channel has a nonzero failure rate, and a lost report is
  indistinguishable from a station that never ran. Should say: write the Self-Debug Report to a named
  file on disk FIRST; the RETURN carries the verdict + the pointer + the gauges, never the body.
- **REWRITE-A4 · `:88`** — "escalate to a human when the failure is high-risk or externally blocked".
  Right instinct, wrong topology: a worker below main has no human channel. Should say: STOP and RETURN
  the decision with its options to whoever dispatched you (NO STATION CONSUMES A CONSENT ASK); a return
  either declares no pending decision or names one — silence is not "none".
- **REWRITE-A5 · `:115`** — "Preventive change to encode later" names no destination. Under
  MEMORY-ISOLATION a role writes only its OWN role store. Name it: `<repo>/.claude/agent-memory/<role>/`,
  and route anything outside that as a courier package rather than writing it.

### ADD (missing by our standard, not upstream's fault)
- **ADD-A1** — no `## Grants & denials (CLASSIFY-BLOCK)` section. `skill-authoring.md` §5b is MUST for
  every NEW skill authored from this point; an installed intake skill is new to us. Needs read/write/
  spawn/network rows plus the shared `<!-- SHARED:CLASSIFY_BLOCK -->` marker.
- **ADD-A2** — carries none of our shared partials (language header, escalation, reporting footer). If it
  installs into a room that renders them, it must take the markers; if it installs zone-level, state that
  divergence explicitly rather than leaving it silent.

### NOT a collision (checked, so nobody over-cuts later)
- Phases 1-4 have one agent diagnose its OWN failure. Our reviewer/maker split bans a sub **verifying its
  own work product**; diagnosing your own crash is not that. Leave it.
- The skill spawns nothing — no-zombie / bounded-fan-out contract is not engaged.

---

## SKILL 2 — `verification-loop`

### VERDICT: PASS-with-adapt-list — but read the list before believing the verdict
Every one of its six phases is inoperable here and needs replacing; its cadence and its one command must
be cut. What survives adaptation is the REPORT TABLE (`:91-107`) and nothing else. See OWNER-2.

### CUT
- **C-B1 · `:56`** — `# Target: 80% minimum` coverage threshold. **Direct collision** with `testing.md`:
  *"EXPECT a high number; never REQUIRE one"*, *"NOTHING blocks on a percentage"*, *"~100% is a smell"*.
  A hardcoded floor is the exact instrument that rule forbids. Cut the number; keep "report coverage as a
  diagnostic".
- **C-B2 · `:111`** — "run verification every 15 minutes". A wall-clock cadence: non-deterministic
  (Phoenix #8), unenforceable (no timer exists), and against the flock's standing no-calendar-cadence
  practice. Cut; replace with event triggers (REWRITE-B4).
- **C-B3 · `:119`** — `Run: /verify`. **No such command exists** (measured 0). Same inoperable-lever
  class as `/compact` — it would train a reader to believe in a lever that is not there.

### REWRITE
- **REWRITE-B1 · `:20-57` (Phases 1-4)** — `npm run build` · `pnpm build` · `npx tsc --noEmit` ·
  `pyright` · `npm run lint` · `ruff` · `npm run test --coverage`. Measured: **zero `package.json` and
  zero `.ts/.tsx` in the entire factory**; `pnpm`/`tsc`/`pyright`/`ruff` all absent from PATH. Every
  command is a no-op or an error here, and prescribing an install would breach Phoenix #2 (zero-dep).
  Replace the four phases with the three gates this flock actually runs:
  `node scripts/test.mjs` · `node scripts/verify.mjs` · `node scripts/consistency.mjs`,
  plus the PowerShell parity legs where a room ships them (`ps-config.test.ps1`, `ps-hooks.test.ps1`,
  gated on `command -v pwsh`, with a visible SKIP when absent).
- **REWRITE-B2 · `:65-73` (Phase 5)** — hand-rolled `grep -rn "sk-"` / `"api_key"` secret scan plus a
  `console.log` grep scoped to `src/` + `*.ts`/`*.tsx` (paths that do not exist here). Collides with
  `security.md`, which states our secret scanning is **GitHub-native push-protection**, server-side, and
  that grep-class tools are *not* what this flock runs. Replace with: cite the live mechanism; scope the
  debug-statement grep to our real extensions (`.mjs`/`.cjs`/`.js`/`.ps1`) and our real layout.
- **REWRITE-B3 · `:75-80` (Phase 6)** — `git diff HEAD~1`. Our no-external-assumption rule makes git an
  OPTIONAL enhancement, never a runtime requirement, and `HEAD~1` is wrong for any multi-commit unit.
  Replace with a range against the unit's base plus a non-git fallback that degrades visibly.
- **REWRITE-B4 · `:10-16` + `:109-120`** — retrigger on our own events instead of a timer: at the room
  gate's OUT step, before the department head's FINAL CHECK, and on a findings-back round. Name the
  stations, never ordinals.
- **REWRITE-B5 · `:102`** — "Overall: [READY/NOT READY] for PR". Our belt does not end at a PR; it ends
  at FINAL CHECK then SHIP by the room's department head. Restate in station vocabulary, and add the
  forcing function: name WHO cleared each station, or the unit did not clear it.

### ADD
- **ADD-B1** — same CLASSIFY-BLOCK requirement as ADD-A1. This one genuinely needs it: it prescribes
  `Bash` execution throughout, and a denied exec is exactly the silent-death class §5b exists for.
- **ADD-B2** — the report table has no row for the room gate's own OUT step (MEMORY updated), the station
  our belt treats as non-skippable.

### THE INTAKE-NOTE'S PROPOSAL — TESTED, AND IT DOES NOT SURVIVE INTACT
The note proposes "map phases onto the room gate + CI legs". Tested: the mapping works *mechanically*
(6 phases → 3 gates + 6-leg CI matrix + PS legs), but it reveals the problem rather than solving it.
**Those gates already run, unconditionally, in `.githooks/pre-commit`, `.githooks/pre-push` and
`ci.yml`.** A skill that tells an agent to run gates the hooks already force adds no reachable behaviour
— `skill-authoring.md` §3's bar ("does removing it break a REAL, reachable behavior? No → remove it").
What is genuinely absent from our stack is the **single PASS/FAIL report shape** (`:91-107`), which today
is scattered across each room's own prose. That is a real gap, and it is one table, not a skill.

---

## PENDING OWNER DECISIONS (returned, not decided here)

- **OWNER-1 — `allow_implicit_invocation: true`, both `agents/openai.yaml:7`.** A skill that can fire
  without being asked spends tokens with no press. Our consent-gate law: *"Consent-gate every
  token-spending action … a silent expensive op = theft, not a feature."* Options: (a) flip both to
  `false` before install; (b) keep it for `agent-introspection-debugging` only (it fires on an
  already-failing run, where the spend is already happening) and disable it for `verification-loop`;
  (c) keep both as upstream shipped them and accept the divergence, named.
- **OWNER-2 — is `verification-loop` an ADAPT or an AUTHOR-FRESH?** After the adapt list above, none of
  the original executable content remains; only the report table survives. Options: (a) adapt anyway and
  keep the upstream name/provenance; (b) author a fresh room-gate-report skill and decline the intake,
  recording the report table as the one thing borrowed; (c) do not install — fold the table into the
  existing station-report convention and add no skill at all.
- **OWNER-3 — the three dead cross-references (C-A1).** Options: (a) cut the three lines; (b) keep them
  as a named "upstream siblings we did not take" note; (c) stage those siblings for their own audit.

## Gates
Not run — this unit stages no code into any room and changes no dist. Nothing to gate.

## Reviewer note
Both files pass the mechanical frontmatter bar: `name:` matches the parent directory, `description` is
well under the 1024 flock cap, bodies are 125 and 152 lines (comfortably inside the §3b body budget).
The defects are all doctrine-fit and operability, never form.
