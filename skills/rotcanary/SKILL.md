---
name: rotcanary
description: Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Auto-runs at session end on touched files (QUICK, report only). Run manually for fix mode. Reports; fixes on request via choice-gated menu.
---

# Rotcanary

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
Default = report only. After report, pop choice:
- **แก้ที่ปลอดภัยเลย** — safe/mechanical/reversible only (dead import, commented block, format). Each: checkpoint (git stash/commit) → apply → re-run build+tests → revert if newly red.
- **ให้ฉันเลือก** — list findings; apply only user-selected.
- **รายงานอย่างเดียว** — change nothing.

Non-interactive / CI / Stop-hook → report only, always.

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
