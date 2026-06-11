---
name: scale-canary
description: >-
  Performance complexity and resource allocation canary — checks for O(N^2) loops, database N+1 query patterns, memory leaks (unbounded collections), and blocking calls in main event loop. Triggers on keywords: "/scale-canary", "scale-canary", "performance audit", "scale audit". Use when writing loops over growing data, DB queries, caches, or async/event-loop code.
---

# Scale Canary (Performance & Resource Allocation Audit)

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Audit code for scalability issues, performance bottlenecks, and resource leaks.

## Auditing Categories
1. **O(N^2) Complexity** — Nested loops over growable collections without indexing or caching (causes performance crashes at scale).
2. **N+1 Database Queries** — Querying database records in a loop instead of performing a batch JOIN or using bulk prefetching.
3. **Memory Bloat / Leaks** — Appending data to global arrays or maps without clearing them, leading to unbounded memory growth.
4. **Blocking Main Loop** — Performing synchronous file system operations or CPU-heavy calculations in the main event thread (causes lag/hangs).
5. **Resource Leakage** — Leaving streams, connections, or file handles open without closing them inside a `finally` block.

Per-ORM N+1 shapes, per-stack blocking patterns, and scoping rules (what NOT to flag): read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe optimizations:** Replace synchronous file operations with asynchronous ones, and insert `finally` blocks for stream closing.
- **Let me pick:** Allow the user to select specific optimizations.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | bottleneck | severity | finding | optimization plan |`

Severity: CRITICAL (O(N^2) on user-facing API / unclosed file handles) · HIGH (N+1 query pattern / blocking main loop) · MEDIUM (unbounded cache grow) · LOW (minor efficiency suggestions)

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot performance check, hot paths only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced scalability audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial profiling verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.

