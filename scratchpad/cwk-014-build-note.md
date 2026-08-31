# CWK-014 (a)+(b) — BUILD note

## (a) agent-introspection-debugging — applied edits (top-down, content-anchored)

- CUT C-A1: Integration section reduced from 4 lines to 1 — `verification-loop` kept,
  made conditional ("if that skill also being installed here"); `continuous-learning-v2`
  / `council` / `workspace-surface-audit` removed (measured 0/0/0 in flock).
- REWRITE-A1 (`:84` Safe recovery bullet): "trim low-signal context" replaced with the
  reviewer's own wording — stop ADDING bulk going forward, never clear/compact/re-birth
  a resident on context grounds.
- REWRITE-A2 (`:66` diagnosis-table row): added a scope-note paragraph right after the
  table (editing inside one table cell would have broken table formatting) distinguishing
  a leaf's own emitted bulk from a resident's normal compaction-cycle occupancy.
- REWRITE-A3 (Phase 4 intro): chat-report framing replaced with disk-first — write the
  report to a named file, return carries only verdict+pointer+gauges.
- REWRITE-A4 (`:88` "escalate to a human"): replaced with STOP-and-RETURN-to-dispatcher,
  citing NO STATION CONSUMES A CONSENT ASK.
- REWRITE-A5 (`:115` "Preventive change to encode later"): named the destination —
  `<repo>/.claude/agent-memory/<role>/`, anything outside it is a courier package.
- `:90` (the auto-healing-claim line) — left untouched, per the reviewer's own finding
  that it already matches our doctrine.
- ADD-A1: new `## Grants & denials (CLASSIFY-BLOCK)` section + `<!-- SHARED:CLASSIFY_BLOCK -->`
  marker, placed before `## Output Standard` (mirrors rot-canary's own placement).
- ADD-A2: judgment call, see RETURN below — did NOT insert LANGUAGE_HEADER/REPORTING_FOOTER/
  ORCHESTRATION/ESCALATION_FOOTER markers wholesale; wrote an explicit install-time note
  instead, since (1) install destination (room vs zone-level) is still undecided, and
  (2) unlike CLASSIFY_BLOCK (a universal MUST), applicability of the other partials'
  actual CONTENT to a self-debug-report skill (as opposed to a canary-findings skill) is
  unverified — fabricating markers for content I can't confirm fits felt worse than
  naming the gap. Flagging this for the chair/reviewer to confirm or override.

All five REWRITEs, the one CUT, and both ADDs are applied. Nothing skipped.

## (b) verification-report.md

Written at `../.claude/rules/verification-report.md`, 3,318 bytes. One PASS/FAIL shape
+ a short provenance/when-to-use lead + a short "deliberately left out, and why" section
naming the three cuts (coverage floor, /verify + timer, web-stack tooling) so a future
reader sees them as a decision, not an oversight. Phases point at "the room gate" / "the
CI matrix" / "PS parity" / station names generically (this rule sits at the CoalWorks
factory-floor level, read by every room, not just CoalMine — pinning it to CoalMine's own
script filenames would misdescribe a room with different gate names).

Did not touch `INTAKE-NOTE.md`, any other room, or the staged `verification-loop/` copy
(left in place for the chair to remove after gate passes).

Gates: none run — this unit stages no code into any room's `plugin/` or dist, matches
the reviewer's own "Gates: not run" disposition on CW-013.
