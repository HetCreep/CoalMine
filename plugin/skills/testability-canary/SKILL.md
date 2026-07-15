---
name: testability-canary
description: >-
  Testability and design decoupling canary — checks for tight coupling, lack of Dependency Injection (DI), hardcoded constructors, Single Responsibility Principle (SRP) violations, and mockability gaps. Triggers on keywords: "/testability-canary", "testability-canary", "testability audit", "decoupling". Use when refactoring coupling, introducing DI, or making code unit-testable.
---

# Testability Canary (Decoupling & Mockability Audit)

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Audit code to ensure it is decoupled, modular, and easy to cover with automated tests.

## Auditing Categories
1. **Hardcoded Constructors** — instantiating deps inside classes (`new DatabaseClient()`) instead of injecting via constructor/factory (prevents mocking).
2. **SRP Violations** — a class or method doing too many distinct duties (e.g. a service that also parses JSON and formats UI).
3. **Static Dependencies** — reliance on global static methods or Singletons that make test isolation impossible.
4. **Time & Environment Coupling** — direct `DateTime.Now`, `fs`, or `process.env` calls without an abstraction layer (fragile time/path-sensitive tests).
5. **Private Logic Gaps** — complex business logic hidden in private methods that can't be tested directly (extract to testable helpers).

Per-stack patterns and the mock-strategy vocabulary: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the report, present via `ask_question`:

- **Apply safe refactoring:** extract hardcoded initializations into constructor params (DI) + add interface definitions. Each fix: checkpoint (git stash/commit in a git repo; else copy the file aside — never assume git) → apply → build + tests → auto-revert if newly red.
- **Let me pick:** user selects specific refactoring moves.
- **Report only:** exit unchanged.

## Output
`| file:line | coupling point | severity | finding | mock strategy |`

Severity: CRITICAL (un-mockable external write/network call) · HIGH (SRP violation blocking unit testing) · MEDIUM (time/env coupling) · LOW (minor static dependency)

## Escalation — Scope & Model Quality

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. No lever for one? **Degrade gracefully — never fake parallelism you can't do**; escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Cost |
|---|---|---|---|
| **Light** | Spot coupling check, key classes only | Cheapest model · single agent, no sub-agents. | Low |
| **Standard** | Balanced decoupling audit, multi-category | Balanced model · raised reasoning · sub-agents per category **only if your platform runs concurrent workers** (else single-agent). | Balanced |
| **Heavy** | Full 5-category audit + adversarial verify | Most capable model + largest context · deepest reasoning · max sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

Per-platform Heavy levers + Heavy-run durability: read `references/escalation.md` before a Heavy run. No concurrent fan-out on your host → escalate by model + reasoning only.

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the pick marked `✓`, score shown, labels localized — and wait for the choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Copilot `askQuestions` · Gemini CLI `ask_user` (business-tier product; individual tiers ended 2026-06-18 → Antigravity CLI) · Codex `request_user_input` · Cursor/Devin Desktop (ex-Windsurf)/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** scope already audited ≥Standard this session → cap at Light (re-auditing fresh ground wastes tokens; scope to what changed). **Default tier:** honor `.coalmine.json` `defaultTier` unless the user requests a tier for that run — an explicit request overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. Interactive session (a user is present) → offer the fix menu after the report; non-interactive → report-only. Never fix without a chosen option.

**Entanglement:** after the report, if confirmed findings fall in another canary's domain, offer it once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

**Self error-report:** if this skill misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a user-reviewed summary — never auto-submit, never include unapproved code or paths.

