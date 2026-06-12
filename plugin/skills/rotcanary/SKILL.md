---
name: rotcanary
description: >-
  Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Triggers on: "/rotcanary", "rotcanary", "code-health". Auto-runs at session end on touched files (QUICK, report only) via platform hooks — auto-wired by the Claude Code plugin, manual elsewhere. Run manually for fix mode. Reports; fixes on request via choice-gated menu.
---

# Rotcanary

**Language:** Mirror the user's current writing language for EVERYTHING you generate at runtime — questions, answer options and menu labels, tier recommendations, report narrative, and status messages. Detect from their messages (Thai → Thai, Japanese → Japanese, …); never hardcode one language, and never fall back to English just because this skill file is written in English. Technical terms MAY stay in English where translation would hurt precision: tool/command names, file paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Scan code for rot. Report CONFIRMED findings. Fix on request.

## Parameters
- **SCOPE:** touched files (default) | diff | named files | whole repo
- **DEPTH:** QUICK (default) | DEEP

## Categories
1. **Bug-risk** — null deref, wrong operator, off-by-one, missing return
2. **Dead / unreachable** — zero-ref symbols, code after return/throw, always-true guards
3. **Disconnected** — exists but never wired to entry point, half-done refactor
4. **Duplication** — copy-paste diverged, two sources of truth for one constant
5. **Resource leak** — undisposed handle/stream/COM, subscription never removed
6. **Async** — unawaited task, `.Result`/`.Wait()` deadlock, blocking on UI thread
7. **Silent failure** — empty catch, success on partial completion, ignored return code
8. **Input security** — unvalidated input, injection, path traversal, secret in code/log
9. **Performance** — O(n²) in hot path, N+1, unbounded growth, work on UI thread
10. **Doc rot** — comment contradicts code, stale TODO, wrong param in docstring

## Discipline
- Report only CONFIRMED. Unverifiable → separate "SUSPECTED" list.
- Cite evidence (file:line, call-site count, the absent catch).
- "Dead" = zero reachability via ALL routes (reflection, DI, events, public API, tests).

## Fix mode (choice-gated)

In Agent Context, after the scan report you **MUST** present this menu via `ask_question`:

- **Apply safe fixes:** mechanical, fully reversible edits only (dead imports, commented-out blocks, formatting). Each fix: checkpoint (git stash/commit) → apply → build + tests → auto-revert if newly red.
- **Let me pick:** list findings; user selects.
- **Report only:** exit unchanged.

NEVER auto-fix: live/reachable path · logic change · "API looks wrong" (ground via source-grounding first) · framework-wired code that only *looks* dead · SUSPECTED findings.

## Output
| # | path:line | category | severity | finding | evidence | fix |

Then: SUSPECTED list · coverage gaps · counts + top 3 to fix.

Severity: CRITICAL (data loss/security/crash on normal path) · HIGH (real bug/leak on reachable path) · MEDIUM (dead/dup/unwired) · LOW (style/doc rot)

## Cadence
Stop hook → auto QUICK on session's touched files (report only); manual whole-repo DEEP sweep when needed. Auto-wiring is platform-dependent — read `references/cadence.md` before claiming auto-scan works on the current platform.

## Tooling
Per-stack build/dead-code/lint commands: read `references/tooling.md` when selecting scan tools.

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Fast scan, minimal coverage | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced scan, module-level coverage | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full scan, maximum coverage | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.
