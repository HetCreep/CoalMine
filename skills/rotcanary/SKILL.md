---
name: rotcanary
description: Language-agnostic code-health audit — finds dead code, unwired/disconnected code, bug-prone logic, duplication, resource leaks, concurrency bugs, silent failures, input-boundary security issues, and doc rot. Use when reviewing code after writing or refactoring, before a commit or release, or for a periodic deep sweep. Auto-invoked at session end after code edits by this plugin's Stop hook. Fans out to sub-agents with model-aware task distribution when the host supports them; runs inline otherwise. Reports findings; does not fix unless asked.
---

# Rotcanary

Find dead, broken, risky, and disconnected code and REPORT it. Do NOT fix unless the user says "fix".

## Parameters (infer if not given)
- **SCOPE:** whole repo | named files | the git diff | the files a Stop-hook listed. Default: the touched files passed in → else the diff → else ask.
- **DEPTH:** QUICK (default) | DEEP.
- **STACK:** auto-detect from the files.

If invoked with arguments, parse SCOPE / DEPTH / STACK from them: `$ARGUMENTS`

## Discipline (non-negotiable)
- Report only CONFIRMED findings. Unverifiable → a separate "SUSPECTED (unverified)" list. Never present a guess as fact.
- Every finding cites evidence (call-site count, the unreachable branch, the missing await).
- State what you did NOT cover. Silent truncation reads as "all clear" — it isn't.

## 0. Orient first
- Detect stack(s), build system, entry points (main / CLI / routes / handlers / DI roots / plugin attrs).
- Build once with warnings on — cheapest signal for unused / unreachable / shadowed.
- Run the stack's static analyzer + dead-code tool (table below). Treat output as LEADS to verify, not verdicts.

## 1. Categories (the "what")
1. **Correctness / bug-risk** — off-by-one, wrong operator (`<` vs `<=`), inverted/short-circuit condition, null deref, unchecked optional/nullable, overflow, swapped or copy-pasted-mismatched args, missing return.
2. **Dead & unreachable** — symbols (fn/class/const/field/var) with ZERO refs; code after return/throw/break; `if(false)`/always-true guards; unused params; orphan files imported nowhere; unused exports; commented-out blocks; flagged-off code never enabled.
3. **Disconnected / unwired** — exists but never invoked from any entry point; handler defined, never subscribed; config key read-nowhere or written-nowhere; DI registration never resolved; route/command/endpoint not wired; half-done refactor (new fn added, old call site never switched).
4. **Duplication / drift** — copy-paste that diverged; two sources of truth for one constant/list; parallel implementations of the same logic.
5. **Resource & lifecycle** — undisposed handle/stream/socket/font/COM; missing using/with/defer/RAII; event subscription never removed (leak); resource opened on a path that can throw before close; timer/task never cancelled.
6. **Concurrency / async** — async-void, unawaited fire-and-forget, `.Result`/`.Wait()` deadlock, blocking call on a UI/event-loop thread, shared mutable state without a lock, race on lazy init, missing cancellation, serial awaits that should be parallel.
7. **Error handling / silent failure** — empty catch, catch-and-continue hiding corruption, success returned on PARTIAL failure, error logged but not propagated where the caller must know, bare `except:`/`catch(...)`, ignored return code / error value, fallback that masks the real fault.
8. **Security at input boundaries** — untrusted input (file/network/user/env) used unvalidated; injection (SQL/command/path-traversal/zip-slip); secret in source or log; missing allowlist validation; unsafe deserialization; TLS check disabled. Tailor to the surface (desktop vs web vs server).
9. **Performance** — O(n²) in a hot path; work on the UI/event-loop thread; N+1 / redundant I/O in a loop; missing cache for an expensive repeat; unbounded growth (log/list/cache with no cap); large alloc in a loop; re-parse/re-compile per call.
10. **Doc / comment rot** — comment contradicts code; stale TODO/FIXME (verify if still real); docstring with wrong params/return; README/docs claim a feature the code lacks (or vice versa); version/path/flag mention that no longer matches.

## 2. Verify before reporting (kills false positives)
- **"Dead"** needs ZERO reachability via ALL of: direct calls, reflection, DI/IoC, serialization, events/delegates, public API/library export, test-only use, build-time codegen, string-keyed/dynamic lookup. Reachable by ANY → not dead.
- **"Unwired"** — prove the entry-point gap (show the missing registration/route/subscribe site).
- **"Bug"** — show the exact triggering input/branch, or label it SUSPECTED.
- **"Duplication"** — show both locations and what diverged.

## 3. Severity
- **CRITICAL** — data loss, security hole, crash on a normal path. (BLOCK)
- **HIGH** — real bug, leak, or silent failure on a reachable path. (FIX SOON)
- **MEDIUM** — maintainability: dead code, duplication, unwired remnant. (CLEAN UP)
- **LOW** — style, naming, comment rot. (OPTIONAL)

## 4. Depth
- **QUICK** — build warnings + tools + scan SCOPE; verify; one pass.
- **DEEP** — whole repo; trace cross-file wiring; cluster duplication; manual reachability for reflection/DI; re-scan your own conclusions; loop categories until a pass finds nothing new.

## 5. Execution mode — use sub-agents when the host supports them
Check whether the host agent exposes a **sub-agent / task / parallel-worker** capability.

- **No sub-agents** (most non-Claude-Code hosts) → run **inline**, single pass. Done.
- **Sub-agents + large job** (DEEP, whole-repo, or many files) → **orchestrate**:
  1. **Partition** — one scanner per category (§1), or per file-group on big repos.
  2. **Assign by model tier** — each scanner gets the *cheapest* tier that does its category justice (map below). No frontier model on mechanical dead-code; no tiny model on a race-condition hunt.
  3. **Run in parallel** — respect the host's concurrency cap (unknown → ≤ ~6). Each scanner returns the §6 schema.
  4. **Synthesize** (mid tier) — merge + dedup across scanners.
  5. **Adversarial verify** (strong tier) — for each CRITICAL/HIGH, a skeptic sub-agent tries to *refute* it (§2); keep only survivors.
  6. Main agent writes the final report (§6).
- **Sub-agents + small job** (QUICK on a few touched files, e.g. the auto session-end scan) → **inline**; don't spawn workers for a handful of files.

### Model-tier map (map to your host's equivalent tiers; examples illustrative)
| Tier | Scan these categories | Why | e.g. |
|---|---|---|---|
| **FAST / cheap** | dead & unreachable · duplication · doc/comment rot · unused | mechanical, tool-assisted, high-volume, low-nuance | Haiku · GPT-mini · Gemini Flash |
| **MID** | correctness/bug-risk · resource & lifecycle · error-handling/silent-failure · disconnected/unwired | cross-file reasoning, moderate nuance | Sonnet · GPT · Gemini Pro |
| **STRONG** | concurrency/async (races, deadlocks) · input-boundary security · architectural wiring · **the verify pass** | deepest reasoning, highest stakes | Opus · o-series · Gemini Pro (thinking) |

One model only? Run all tiers on it — partition + parallelism still cut wall-clock. Scale by DEPTH: QUICK = only the categories relevant to the touched files + a single verify vote; DEEP = all categories + a 3-vote adversarial verify, loop until a round finds nothing new.

## 6. Output
Findings table, sorted by severity:

| # | path:line | category | severity | finding | evidence (why it's real) | suggested fix |

Then:
- **SUSPECTED (unverified):** with what blocked verification.
- **Coverage & gaps:** what was scanned · what was skipped · tool limits hit.
- **Summary:** counts by severity; the top 3 to fix first.

## Cadence (how this fires)
Principle: **DEPTH ∝ 1 / FREQUENCY.** Shallow + often, deep + rarely.

This plugin **bundles** the two auto tiers — when the plugin is enabled they activate automatically (no `settings.json` editing):

| Trigger | Frequency | Depth | Fires via |
|---|---|---|---|
| Per edit | continuous | tripwire | bundled `PostToolUse` hook — records touched code files + flags conflict-markers / >800-line files |
| Per session-end | per session | QUICK | bundled `Stop` hook — auto-invokes this skill on the session's touched files (loop-guarded, one-shot) |
| Per release / merge | per release | QUICK | run manually / in CI on the diff + the security category + a dependency audit |
| Milestone / ~5 releases | rare | DEEP | run manually at DEPTH=DEEP, whole repo |

**Requires Node.js on PATH** (bundled with the npm install of Claude Code). The hooks are cross-platform Node scripts. No Node? Use the PowerShell scripts in `alt/powershell/`, or just invoke this skill manually. **Modes** — `~/.claude/.rotcanary-mode` = `auto` (default: tripwire + auto scan) / `manual` (tripwire only, no auto scan — you run `/coalmine:rotcanary`) / `off` (silent). `/coalmine:rotcanary` works in every mode. (`.rotcanary-off` = off, back-compat.)

## Tooling by stack (run the build-warn + dead-code + lint columns)
| Stack | build / warnings | dead-code / unused | lint / type |
|---|---|---|---|
| C#/.NET | `dotnet build -warnaserror`; Roslyn IDE0051/CS0162 | analyzers; `dotnet format --verify-no-changes` | Roslyn analyzers, nullable |
| TS/JS | `tsc --noEmit` | `knip`, `ts-prune`, `depcheck` | `eslint` |
| Python | `python -W error` | `vulture`, `ruff` (F401/F841) | `mypy`/`pyright`, `ruff` |
| Rust | `cargo build` (warns); `dead_code` lint | `cargo +nightly udeps`, `cargo machete` | `cargo clippy` |
| Go | `go build`, `go vet` | `deadcode`, `staticcheck` | `staticcheck`, `golangci-lint` |

If a tool isn't installed, say so and fall back to grep-based reachability — never skip silently.

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.
