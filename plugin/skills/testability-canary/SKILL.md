---
name: testability-canary
description: >-
  Testability and design decoupling canary — checks for tight coupling, lack of Dependency Injection (DI), hardcoded constructors, Single Responsibility Principle (SRP) violations, and mockability gaps. Triggers on keywords: "/testability-canary", "testability-canary", "testability audit", "decoupling". Use when refactoring coupling, introducing DI, or making code unit-testable.
---

# Testability Canary (Decoupling & Mockability Audit)

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

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

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes ⑤ scope not already audited ≥Standard this session. **0–1 Light · 2–3 Standard · 4–5 Heavy.** An explicit user tier request always overrides.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. If the session is interactive (a user is present), offer the fix menu after the report; truly non-interactive runs stay report-only. Never fix without a chosen option.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).

**Entanglement:** after delivering the report, if confirmed findings fall in another canary's domain, offer that canary once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

