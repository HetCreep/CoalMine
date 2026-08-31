# CWK-016 — BUILD note

## Unit 1 — `loop-design-check` (`../.claude/skills-intake/loop-design-check/SKILL.md`)

Pre-check: confirmed `autonomous-loops` / `continuous-agent-loop` are absent from the flock
(`grep -rl "^name: autonomous-loops\|^name: continuous-agent-loop"` over CoalWorks — zero hits),
matching the reviewer's own measurement. Also confirmed the installed sibling's current home is
the ZONE dir `CoalWorks/.claude/skills/agent-introspection-debugging/` (moved there since my
CWK-014(a) install, presumably by the chair) — matches this dispatch's framing, so mirroring its
marker shape is grounded in present reality, not stale memory.

1. CUT dead refs — found and cut in **three** places, not one: the body bullet at orig `:21`,
   the closing "Lineage" footer's mechanism-layer pointer, AND the frontmatter `description:`
   field's "Complements... (autonomous-loops, continuous-agent-loop)" clause. The dispatch named
   only `:21`; I swept the other two for the same defect class rather than leave a half-swept
   dead reference standing in the very sentence the harness reads for skill-triggering.
2. REWRITE `:121` (worked example) — "coverage not lowered" -> "coverage does not regress
   against the prior run" + an explicit parenthetical: delta check against its own prior value,
   never a numeric floor, coverage stays a diagnostic not a gate.
3. REWRITE (Step 3, Judge) — added one line mapping Build->MAKER, Judge->GATE, MAKE->GATE
   vocabulary, pass=forward/fail=bounce-to-MAKER-never-patched-never-escalated-past-dispatcher.
   Left the existing Plan/Build/Judge table and its "fail -> return to Build" wording intact
   (already correct); added the house-vocabulary mapping alongside it rather than replacing it.
4. ADD CLASSIFY-BLOCK — one row (read-only; the skill is prose-only judgment guidance, no
   write/spawn/network step exists to grant). Placed as its own section right before "One-line
   close", marker included.
5. ADD LANGUAGE_HEADER marker — placed title/blank/marker/blank/body, matching the installed
   sibling's exact shape (verified against `agent-introspection-debugging/SKILL.md:8`).

English pass: read the whole file for prose quality. It is already clean, native-register
English throughout — I made no wording changes beyond the four substantive edits above and did
not manufacture busywork edits to look like I'd done a pass. Said so plainly in the return.

Markers: mirrored, not decided. Flagging (not acting on) the reviewer's own CWK-014 zone-install
dangling-marker concern, per instruction — that ruling is the reviewer's to make over both
skills at once.

## Unit 2 — `../.claude/rules/verification-report.md`

One paragraph only. Old: cited a live directory
(`CoalWorks/.claude/skills-intake/verification-loop/`) that CWK-014 deleted. New: states the
true chain — staged+INSPECTed under CWK-013, distilled under CWK-014(b), staged copy then
deleted deliberately because this rule replaces it. Rest of the file (the gated-SHIP body)
untouched.

## Not touched
`INTAKE-NOTE.md`, the other 4 staged skills, `../.claude/skills/agent-introspection-debugging/`.
No commit/push/install/move performed.
