---
name: scale-canary
description: >-
  Performance complexity and resource allocation canary — checks for O(N^2) loops, database N+1 query patterns, memory leaks (unbounded collections), and blocking calls in main event loop. Triggers on keywords: "/scale-canary", "scale-canary", "performance audit", "scale audit". Use when writing loops over growing data, DB queries, caches, or async/event-loop code.
---

# Scale Canary (Performance & Resource Allocation Audit)

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

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

## Output
`| file:line | bottleneck | severity | finding | optimization plan |`

Severity: CRITICAL (O(N^2) on user-facing API / unclosed file handles) · HIGH (N+1 query pattern / blocking main loop) · MEDIUM (unbounded cache growth) · LOW (minor efficiency suggestions)

## Escalation — Scope & Model Quality

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. If your platform lacks a lever, **degrade gracefully: never fake parallelism you cannot do** — escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Token Cost |
|---|---|---|---|
| **Light** | Spot performance check, hot paths only | Cheapest/fastest mode · most economical model · single agent, no sub-agents. | Low |
| **Standard** | Balanced scalability audit, multi-category | Balanced model · default/raised reasoning · focused sub-agents per category **only if your platform runs concurrent workers** (else stay single-agent). | Balanced |
| **Heavy** | Full 5-category audit + adversarial profiling verify | Most capable model + largest context · deepest reasoning (max/xhigh) · maximum sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

**Per-platform Heavy lever** (use your host's): Claude Code → Dynamic Workflows / `ultracode` (≤16 concurrent agents); OpenAI Codex → `xhigh` effort + subagents + Cloud `--attempts`; Cursor → Max Mode + Cloud Agents; Antigravity → Agent Manager + Planning Mode; Amp → deep mode + Oracle + subagents; GitHub Copilot → Cloud agent + high Thinking Effort; Goose → subagents + Goosetown; JetBrains → Junie Brave + Junie CLI. **No concurrent-worker fan-out** — single-agent at every tier, escalate by model + reasoning only: **Gemini CLI · Cline · Windsurf** (in-session).

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories/dimensions/aspects relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** if the scope was already audited ≥Standard this session, cap the recommendation at Light regardless of the base score — re-auditing fresh ground wastes tokens; scope the run to what changed since. An explicit user tier request always overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. If the session is interactive (a user is present), offer the fix menu after the report; truly non-interactive runs stay report-only. Never fix without a chosen option.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).

**Self error-report:** if this skill itself misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a summary the user has reviewed — never auto-submit, never include unapproved code or paths.

**Entanglement:** after delivering the report, if confirmed findings fall in another canary's domain, offer that canary once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

