---
name: rot-canary
description: >-
  Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Triggers on: "/rot-canary", "rot-canary", "code-health" (legacy aliases: "/rotcanary", "rotcanary"). Auto-runs at session end on touched files (QUICK, report only) via platform hooks — auto-wired by the Claude Code plugin, manual elsewhere. Run manually for fix mode. Reports; fixes on request via choice-gated menu.
---

# Rot-Canary

<!-- SHARED:LANGUAGE_HEADER -->

Scan code for rot. Report CONFIRMED findings. Fix on request.

## Parameters
- **SCOPE:** touched files (default) | diff | named files | whole repo. Touched files scan uses hybrid capping (scans all if <= autoScanFileCap, otherwise caps at autoScanFileCapSlice most recently modified files and warns user).
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

After any scan report in an interactive session — manual run OR hook-nudged auto-scan — you **MUST** present this menu via `ask_question` (skip only when findings are zero or no user is present):

- **Apply safe fixes:** mechanical, fully reversible edits only (dead imports, commented-out blocks, formatting). Each fix: checkpoint (git stash/commit) → apply → build + tests → auto-revert if newly red.
- **Let me pick:** list findings; user selects.
- **Report only:** exit unchanged.

NEVER auto-fix: live/reachable path · logic change · "API looks wrong" (ground via source-grounding first) · framework-wired code that only *looks* dead · SUSPECTED findings.

## Output
| # | path:line | category | severity | finding | evidence | fix |

Then: SUSPECTED list · coverage gaps · counts + top 3 to fix.

Severity: CRITICAL (data loss/security/crash on normal path) · HIGH (real bug/leak on reachable path) · MEDIUM (dead/dup/unwired) · LOW (style/doc rot)

## Cadence
Stop hook → auto QUICK on session's touched files (report only). To protect the token budget, the Stop hook applies a hybrid cap: if the number of touched files is <= autoScanFileCap (configurable in `.coalmine.json`), all files are scanned; if greater, the scan is capped at the top autoScanFileCapSlice most recently modified files, and a localized warning is displayed to the user. Manual whole-repo DEEP sweep when needed. Auto-wiring is platform-dependent — read `references/cadence.md` before claiming auto-scan works on the current platform.

## Tooling
Per-stack build/dead-code/lint commands: read `references/tooling.md` when selecting scan tools.

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->
