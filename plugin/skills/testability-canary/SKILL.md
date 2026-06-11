---
name: testability-canary
description: >-
  Testability and design decoupling canary — checks for tight coupling, lack of Dependency Injection (DI), hardcoded constructors, Single Responsibility Principle (SRP) violations, and mockability gaps. Triggers on keywords: "/testability-canary", "testability-canary", "testability audit", "decoupling". Use when refactoring coupling, introducing DI, or making code unit-testable.
---

# Testability Canary (Decoupling & Mockability Audit)

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Audit code to ensure it is decoupled, modular, and easy to cover with automated tests.

## Auditing Categories
1. **Hardcoded Constructors** — Instantiating dependencies inside classes (e.g., `new DatabaseClient()`) instead of injecting them via constructor or factory (prevents mocking).
2. **SRP Violations** — Classes or methods performing too many distinct duties (e.g., a service class that also parses JSON and formats UI output).
3. **Static Dependencies** — Heavy reliance on global static methods or Singletons that make isolation in tests impossible.
4. **Time & Environment Coupling** — Direct calls to `DateTime.Now`, `fs`, or `process.env` without abstraction layers (makes testing time-sensitive or path-sensitive behavior fragile).
5. **Private Logic Gaps** — Complex business logic hidden inside private methods that cannot be tested directly (recommend extracting to testable helper modules).

Per-stack patterns and the mock-strategy vocabulary: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe refactoring:** Extract hardcoded initializations into constructor parameters (Dependency Injection pattern) and add interface definitions.
- **Let me pick:** Allow the user to select specific refactoring moves.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | coupling point | severity | finding | mock strategy |`

Severity: CRITICAL (un-mockable external write/network call) · HIGH (SRP violation blocking unit testing) · MEDIUM (time/env coupling) · LOW (minor static dependency)

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot coupling check, key classes only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced decoupling audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.

