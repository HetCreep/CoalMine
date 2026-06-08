---
name: testability-canary
description: Testability and design decoupling canary — checks for tight coupling, lack of Dependency Injection (DI), hardcoded constructors, Single Responsibility Principle (SRP) violations, and mockability gaps. Triggers on keywords: "/testability-canary", "testability-canary", "testability audit", "decoupling".
---

# Testability Canary (Decoupling & Mockability Audit)

<!-- SHARED:LANGUAGE_HEADER -->

Audit code to ensure it is decoupled, modular, and easy to cover with automated tests.

## Auditing Categories
1. **Hardcoded Constructors** — Instantiating dependencies inside classes (e.g., `new DatabaseClient()`) instead of injecting them via constructor or factory (prevents mocking).
2. **SRP Violations** — Classes or methods performing too many distinct duties (e.g., a service class that also parses JSON and formats UI output).
3. **Static Dependencies** — Heavy reliance on global static methods or Singletons that make isolation in tests impossible.
4. **Time & Environment Coupling** — Direct calls to `DateTime.Now`, `fs`, or `process.env` without abstraction layers (makes testing time-sensitive or path-sensitive behavior fragile).
5. **Private Logic Gaps** — Complex business logic hidden inside private methods that cannot be tested directly (recommend extracting to testable helper modules).

## Contexts & Execution Modes

- **Hook Context (Non-Interactive / Stop-Hook):** Run in report-only mode (QUICK depth) on touched files. Output a brief severity table. Do not modify files.
- **Agent Context (Interactive / Chat):** If issues are found, you **MUST** call the `ask_question` tool (if supported) to prompt the user for refactoring.

## Fix mode (choice-gated)

In **Agent Context**, after presenting the audit report, call `ask_question` to present the following options (localized to user's active language):

- **Apply safe refactoring:** Extract hardcoded initializations into constructor parameters (Dependency Injection pattern) and add interface definitions.
- **Let me pick:** Allow the user to select specific refactoring moves.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | coupling point | severity | finding | mock strategy |`

Severity: CRITICAL (un-mockable external write/network call) · HIGH (SRP violation blocking unit testing) · MEDIUM (time/env coupling) · LOW (minor static dependency)

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume, coupling complexity, criticality), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just file count):**
- Small scope · few coupling types · non-critical → recommend **Light**
- Medium scope · multiple categories → recommend **Standard**
- Large scope · all 5 categories · major refactoring · release → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

