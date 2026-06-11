---
name: rotcanary
description: >-
  Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Triggers on: "/rotcanary", "rotcanary", "code-health". Auto-runs at session end on touched files (QUICK, report only) via platform hooks — auto-wired by the Claude Code plugin, manual elsewhere. Run manually for fix mode. Reports; fixes on request via choice-gated menu.
---

# Rotcanary

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

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
Stop hook → auto QUICK on session's touched files (report only). Hook support varies by platform:
- **Auto-wired:** Claude Code — the plugin ships PostToolUse + Stop hooks; GitHub Copilot (VS Code agent mode / CLI) consumes the same hooks format. Kill-switch `~/.claude/.rotcanary-off` applies to these hook installs only.
- **Wire manually** (equivalent events exist — port [`hooks/`](../../hooks/) per platform docs): Cursor `afterFileEdit`/`stop` · Gemini CLI `AfterTool`/`AfterAgent` · Codex `PostToolUse`/`Stop` · Goose `AfterFileEdit`/`Stop`.
- **Manual only** (no stop event): Cline, Junie — run `/rotcanary` yourself, e.g. before commit.
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
| **Light** | Fast scan, minimal coverage | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced scan, module-level coverage | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full scan, maximum coverage | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (Interactive):** Call `ask_question` after scope assessment. Do not start work until user confirms.

**Hook Context (Non-Interactive / Stop-Hook):** Auto-select Light. Skip `ask_question`. Run report-only, no fixes. No sub-agents.

**`ask_question` = your platform's interactive question tool**, whatever its real name: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo Code `ask_followup_question` · GitHub Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in question prompts. If your platform has no such tool (e.g. Goose), present the same options as a numbered text list and wait for the user's reply.

**Heavy Durability (long multi-agent runs):**
- Chunk the run into short orchestration phases (each completing within minutes) and read results between phases — one long-running orchestration is one session interruption away from losing all in-flight work.
- If an orchestration dies mid-run (session restart/kill), recover before re-running: completed sub-agent results usually survive in your platform's run records (run journal, resumable run ID, or per-agent transcripts) — re-spawn only the missing pieces.
