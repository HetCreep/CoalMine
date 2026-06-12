---
name: testability-canary
description: >-
  Testability and design decoupling canary — checks for tight coupling, lack of Dependency Injection (DI), hardcoded constructors, Single Responsibility Principle (SRP) violations, and mockability gaps. Triggers on keywords: "/testability-canary", "testability-canary", "testability audit", "decoupling". Use when refactoring coupling, introducing DI, or making code unit-testable.
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

Per-stack patterns and the mock-strategy vocabulary: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe refactoring:** Extract hardcoded initializations into constructor parameters (Dependency Injection pattern) and add interface definitions.
- **Let me pick:** Allow the user to select specific refactoring moves.
- **Report only:** Exit without making changes.

## Output
`| file:line | coupling point | severity | finding | mock strategy |`

Severity: CRITICAL (un-mockable external write/network call) · HIGH (SRP violation blocking unit testing) · MEDIUM (time/env coupling) · LOW (minor static dependency)

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

