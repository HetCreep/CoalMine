# CWK-014 (a)+(b) — INSPECT of the ADAPTED result

Reviewer: CoalMine code-reviewer (skill-holder). Read-only; nothing changed.
Maker: CoalMine coder `994a1be4`. Build note: `CoalMine/scratchpad/cwk-014-build-note.md`.
Spec checked against: my own `CoalMine/scratchpad/inspect/cw-013-skills-intake-inspect.md`.
Date: 2026-08-27.

---

## UNIT (a) — `.claude/skills-intake/agent-introspection-debugging/SKILL.md` — **SHIP**

Every CUT/REWRITE/ADD from CW-013 landed, and landed correctly. Verified by reading the adapted
file top-to-bottom at its NEW line numbers (the file grew 152 → 168 lines, so my original numbers
had all shifted; I re-anchored on content, never on the old line numbers).

| CW-013 item | landed at | verdict |
|---|---|---|
| CUT C-A1 (3 dead cross-refs) | `:138-140` | ✔ Integration reduced 4 lines → 1; `verification-loop` kept and made **conditional** ("do not point at a sibling that does not exist in this flock"). The three measured-absent skills are gone. |
| REWRITE-A1 (context trim) | `:86` | ✔ My wording, **plus a strengthening clause** the maker added on its own — "no tool trims an agent's own context, and compaction is not a lever you hold". That makes the inoperability explicit rather than implied. Better than what I specified. |
| REWRITE-A2 (overflow row scope) | `:78` | ✔ Placed as a paragraph immediately after the table rather than inside a cell. **Correct call, not a shortcut** — editing a single cell of a 6-row markdown table would have broken its rendering. Leaf-vs-resident distinction stated exactly. |
| REWRITE-A3 (disk-first) | `:106` | ✔ Report written to disk FIRST; return carries verdict + path + gauge, never the body. Cites the mechanism (nonzero channel failure rate; a lost report is indistinguishable from a station that never ran). |
| REWRITE-A4 (consent ask) | `:90` | ✔ REPLACED the "escalate to a human" bullet rather than adding beside it — correct, the old wording would otherwise still stand. Names the law, and carries "silence is not 'none'". |
| REWRITE-A5 (memory isolation) | `:117` | ✔ Destination named `<repo>/.claude/agent-memory/<role>/`, plus the courier clause for anything outside the own store. |
| ADD-A1 (CLASSIFY-BLOCK) | `:142-149` | ✔ Section + `<!-- SHARED:CLASSIFY_BLOCK -->` marker. Two rows (read, write); **no spawn row and no network row is CORRECT** — this skill spawns nothing and fetches nothing, and §5b asks for the classes the skill actually has, not four rows for symmetry. |
| `:90` upstream (auto-healing claim) | now `:92` | ✔ **SURVIVED UNTOUCHED**, character-for-character including the curly quotes, verified against my CW-013 record of the upstream text. |

### Method note on the `:92` check
The staged tree has no upstream copy to `diff` against locally (ECC HEAD `d8409a4` is not cloned here),
so the comparison is against the verbatim quotation captured in my own CW-013 record at inspect time.
Stated rather than implied, since it is a transcription-based check, not a byte compare.

### One thing the maker did NOT do, and was right not to
It did not touch `INTAKE-NOTE.md`, the staged `verification-loop/` copy, or any room. Scope held.

---

## UNIT (b) — `.claude/rules/verification-report.md` — **SHIP**

**Carries only the report shape, pointed at our legs.** The shape (`:23-41`) has four legs — Room gate,
CI matrix, PS parity, Diff — plus a Stations line and an Overall verdict. Every one names OUR machinery:
`test.mjs`/`verify.mjs`/`consistency.mjs` as *examples with "or that room's equivalents"*, `ci.yml` +
CodeQL + Scorecard + markdownlint "as shipped; state which legs exist, never assume the full set",
`ps-config.test.ps1`/`ps-hooks.test.ps1` gated on `command -v pwsh` with a **visible NAMED SKIP**.
Stations are named by NAME (BUILD · DOCS · INSPECT · FINAL CHECK), never by ordinal — conforming to
`AGENTS.md`'s own by-name rule. `:43` forbids padding the shape with a leg the room does not run.

**Nothing I cut is smuggled back.** Grepped `npm|pnpm|tsc|pyright|ruff|/verify|15.minute|coverage`:
7 hits, all in either the provenance lead (`:5-6`, describing what UPSTREAM prescribed) or the
"Deliberately left out, and why" section (`:47-57`, negations). **Zero appear as a prescription.**
- coverage floor → `:47-49`, cut, with `testing.md` quoted. **Quotes verified VERBATIM** against
  `ecc/common/testing.md:15` and `:18` ("EXPECT a high number; never REQUIRE one" · "NOTHING blocks
  on a percentage"). Correctly re-framed as a diagnostic line inside the room-gate row.
- `/verify` + 15-minute timer → `:50-53`, cut, grounded on Phoenix #8 and the no-calendar-cadence
  practice, with the replacement triggers named (gate-OUT, FINAL CHECK, findings-back).
- web-stack tooling → `:54-57`, cut, with the measurement restated (0 `package.json`, 0 `.ts`/`.tsx`,
  tools absent) and Phoenix #2 as the reason. Secret scanning correctly attributed to GitHub-native
  push-protection rather than a `grep` for `sk-`.

**Thin.** 3,318 bytes / 57 lines. Zone-rule siblings: `task-tracking.md` 1,400, `thinking-controls.md`
1,668, `README.md` 923. Larger than those but the same order; nowhere near skill-size (this room's
skills run 7,679–14,400 chars). Not padded toward a skill.

**No collision.** It CITES `testing.md` as an exclusion rationale rather than restating its rule; it
adds no test-coverage policy of its own. It does not re-define any station — it reports against the
production line's existing names. `code-review.md` governs severity/latency of a review; this governs
the SHAPE of a unit's outcome report. Different objects. Not drift.

### NOTE (not a finding against this unit — pre-existing and already declared)
`CoalWorks/.claude/rules/README.md` carries its own warning: *"⚠ LOAD VERIFICATION OWED … THIS
directory's auto-load at this depth has not been probed yet — verify with a marker probe before relying
on ambient load; until then a dispatch that needs a rule here POINTS at it explicitly."* So
`verification-report.md` is, today, a **point-at-it rule, not an ambient one**. That is the directory's
condition, not this file's defect, and the maker could not have fixed it here — but a dispatch expecting
this shape must cite the path until that probe runs. Raised for the chair's awareness, not as a bounce.

---

## ADD-A2 RULING — **CONFIRM in substance, with ONE OVERRIDE, and the answer is destination-dependent**

The maker's shape was right: it applied the one MUST, declined to fabricate the rest, and wrote a
divergence note instead of silently dropping them. That is the correct instinct and I confirm it.
But "declined all four" is one item too many, and the zone case leaves a live defect. Per destination:

### If it installs into a ROOM (a `skills/<name>/` dir with a `render.mjs` build)
- `<!-- SHARED:CLASSIFY_BLOCK -->` — **REQUIRED.** Already present. ✔
- `<!-- SHARED:LANGUAGE_HEADER -->` — **REQUIRED. This is my override.** Measured: **9 of 9** of this
  room's shipped skills carry it, with no exception. The flock's language law binds every user-facing
  output, and a Self-Debug Report is user-facing. A room-installed skill without it is the only skill in
  the room that would default to English regardless of the session's language.
- `<!-- SHARED:REPORTING_FOOTER -->` — **NOT required. Maker's exclusion CONFIRMED, and the mold already
  says so:** `skills/_shared/README.md:10` scopes this marker to *"every canary whose Output is a
  per-defect `file`/`line`/severity table"*. This skill's Output Standard is a narrative report with no
  per-defect table and no severity axis — it fails that scope test by construction, and adding it would
  import a `ReportFindings` panel mapping with nothing to map.
- `<!-- SHARED:ESCALATION_FOOTER -->` — **NOT required. CONFIRMED.** It carries the tier rubric, the
  three-tier `ask_question` pick, and the Entanglement routing table across the nine canaries. This
  skill has no tier ladder and is not a canary; including it would inject a routing list whose domains
  do not apply to a self-debug run.
- `<!-- SHARED:ORCHESTRATION -->` — **NOT required. CONFIRMED.** No fan-out; the skill spawns nothing.

### If it installs ZONE-LEVEL (no render pipeline)
- **The `CLASSIFY_BLOCK` marker MUST be replaced by the partial's literal text before install.** This is
  the second half of the override and it matters: with no renderer, the marker stays a literal HTML
  comment and the reader silently loses the partial's core sentence — *"A denial reaches the WORKER as a
  visible message and propagates no further — never to a caller, never as a catchable condition"* —
  which is the whole point of §5b. The per-row "on denial" cells do not carry it; only the partial does.
  A dangling marker here is worse than no marker: the section reads as complete while its load-bearing
  clause is absent.
- None of the other four apply (no renderer to resolve them, and their content does not fit regardless).

The maker's install-time note (`:151`) already says "add the applicable ones then" — this ruling supplies
*which*, so the installer does not have to re-derive it. Its note should be updated to name
LANGUAGE_HEADER for the room case and the inline-the-partial requirement for the zone case.

---

## PENDING OWNER / CHAIR DECISIONS (returned, not answered)

- **OWNER-A — install destination for `agent-introspection-debugging`: room-level or zone-level?**
  My ruling above gives the complete marker answer for each, so this is now a one-word pick with no
  further analysis owed. Everything else about unit (a) is settled.
- **OWNER-B — carried forward from CW-013, still unanswered: `allow_implicit_invocation: true` in
  `agents/openai.yaml:7`.** The adapt did not touch it (correctly — I did not ask it to). A skill that
  can fire without being asked spends tokens with no press. Options unchanged: (a) flip to `false`;
  (b) keep it for this skill only, since it fires on an already-failing run where the spend is already
  happening; (c) accept the divergence, named.
- **OWNER-C — disposition of the staged `verification-loop/` copy.** Main ruled "distil, do not install",
  and (b) is that distillation. The staged directory is now redundant. Deleting it is the chair's press,
  not the maker's or mine; the build note correctly left it in place.
- **CHAIR — the `CoalWorks/.claude/rules/` load probe** (see NOTE under unit (b)). Until it runs, any
  dispatch relying on `verification-report.md` must cite the path explicitly.

## Gates
Not run, and none owed: neither unit stages code into any room's `plugin/`, changes any dist, or
touches a gated surface. Same disposition as CW-013.
