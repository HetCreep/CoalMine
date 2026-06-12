---
name: resilience-audit
description: >-
  Failure-mode audit (FMEA for software) — for each way the system can fail (network, storage, partial completion, crash, concurrency, bad input), check whether code DETECTS, HANDLES, RECOVERS, and COMMUNICATES it. Triggers on: "/resilience-audit", "resilience-audit", "FMEA audit". Use when touching network, storage, async, retry, or rollback paths. Flags data loss, silent-success-on-failure, missing rollback/retry/idempotency. Reports; does not fix unless asked.
---

# Resilience Audit

**Language:** Mirror the user's current writing language for EVERYTHING you generate at runtime — questions, answer options and menu labels, tier recommendations, report narrative, and status messages. Detect from their messages (Thai → Thai, Japanese → Japanese, …); never hardcode one language, and never fall back to English just because this skill file is written in English. Technical terms MAY stay in English where translation would hurt precision: tool/command names, file paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

For every operation: **"what happens when this FAILS?"** Report; do NOT fix unless asked.

## Failure categories
1. **External I/O** — network down/slow, API 4xx/5xx/timeout, rate-limit. Retry w/ backoff? Timeout set? Clear error vs hang?
2. **Storage** — disk full, permission denied, partial write. Atomic write (temp+rename)? Cleanup on failure? Existing good copy untouched?
3. **Partial completion** — half-done op (extracted 50/100 files). Reported as FAILURE, never success.
4. **Crash / OOM** — killed mid-op. Idempotent restart? No orphaned half-state?
5. **Concurrency** — two instances, race, deadlock. Locking / idempotency / safe re-entry?
6. **Input / data** — malformed, null, truncated, huge. Validate at boundary? Fail-fast with clear error?
7. **Dependency down** — fallback/cache/graceful degrade? Clear error vs silent hang?
8. **Resource exhaustion** — bounded? Backpressure? Cleanup on error path?

## For each failure point, check 4 things
- **Detected?** code notices it (doesn't swallow)?
- **Handled?** retry/fallback/fail-clean — not ignored, not silent-success?
- **Recoverable?** rollback/idempotent; no data loss or corruption?
- **Communicated?** clear error to user+log; not a hang, not a false "done"?

## Discipline
- Trace actual failure path (cite file:line). Don't assume handling exists; prove it.
- "partial = failure" — any path reporting success on partial completion = CRITICAL.
- "logged" ≠ "handled" — swallowed+logged error that corrupts state or returns success = CRITICAL.

## Output
`| operation | failure mode | effect | handling (file:line) | severity | recommended guard |`
Ordering/atomicity findings · Summary (counts + top fixes) · Not assessed

Severity: CRITICAL (data loss/corruption/silent-success) · HIGH (crash/hang/partial-no-recovery) · MEDIUM (poor degradation/missing retry) · LOW (cosmetic)

## Fix mode (choice-gated)
After the report, present via `ask_question`:
- **Fix safe ones** — add missing timeout, null/input validation, clear error+log on unhandled path. Each: checkpoint → fix → build+tests → revert if newly red.
- **Let me pick** — user-selected fixes only.
- **Report only** — change nothing.

NEVER auto-fix: retry/rollback/recovery/atomicity logic (semantic changes can introduce new failure modes).

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot failure-mode check, key paths only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced FMEA, multi-category coverage | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 8-category FMEA + adversarial verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces. On Claude Code, fan out with the bundled `coalmine-scanner` agent (one per category/module — read-only, compressed table output).
