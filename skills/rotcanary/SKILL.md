---
name: rotcanary
description: Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Triggers on: "/rotcanary", "rotcanary", "code-health". Auto-runs at session end on touched files (QUICK, report only). Run manually for fix mode. Reports; fixes on request via choice-gated menu.
---

# Rotcanary

<!-- SHARED:LANGUAGE_HEADER -->

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

## Contexts & Execution Modes

- **Hook Context (Non-Interactive / Stop-Hook):** When triggered automatically by the session-end CLI hook, the agent must run the scan in report-only mode (QUICK depth) and output a brief severity table. Do not ask questions or make modifications.
- **Agent Context (Interactive / Chat / Manual):** When invoked manually by the user, the agent runs in interactive mode. If code issues are found, the agent **MUST** present the Fix Mode choice menu to the user.

## Fix mode (choice-gated)

In **Agent Context**, after presenting the scan report, you **MUST** call the `ask_question` tool (if supported by your platform) to present the following options. Adapt the question title and options to mirror the user's active language:

- **Apply safe fixes:** Apply safe, mechanical, and fully reversible edits (e.g., dead imports, commented-out blocks, formatting). For each fix: checkpoint (git stash/commit) → apply → re-run build + tests → auto-revert if tests fail.
- **Let me pick:** List the findings and let the user select specific fixes.
- **Report only:** Exit without making any changes.

If the `ask_question` tool is not supported, present these choices as a standard text-based list and wait for the user's response in the chat.

NEVER auto-fix: live/reachable path · logic change · "API looks wrong" (ground via source-grounding first) · framework-wired code that only *looks* dead · SUSPECTED findings.

## Output
| # | path:line | category | severity | finding | evidence | fix |

Then: SUSPECTED list · coverage gaps · counts + top 3 to fix.

Severity: CRITICAL (data loss/security/crash on normal path) · HIGH (real bug/leak on reachable path) · MEDIUM (dead/dup/unwired) · LOW (style/doc rot)

## Cadence
Stop hook → auto QUICK on session's touched files (report only).
Manual: whole-repo DEEP sweep when needed.

## Tooling
| Stack | build/warnings | dead-code | lint |
|---|---|---|---|
| C#/.NET | `dotnet build -warnaserror` · Roslyn IDE0051/CS0162 | Roslyn analyzers | nullable, `dotnet format` |
| TS/JS | `tsc --noEmit` | `knip`, `ts-prune`, `depcheck` | `eslint` |
| Python | `python -W error` | `vulture`, `ruff F401/F841` | `mypy`, `ruff` |
| Rust | `cargo build` | `cargo machete` | `cargo clippy` |
| Go | `go build`, `go vet` | `deadcode`, `staticcheck` | `staticcheck` |

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume, complexity, criticality of the work), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just file count):**
- Small scope · low complexity · non-critical → recommend **Light**
- Medium scope · moderate complexity → recommend **Standard**
- Large scope · high complexity · release · security · critical path → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->
