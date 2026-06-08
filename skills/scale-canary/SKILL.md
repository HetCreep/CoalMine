---
name: scale-canary
description: Performance complexity and resource allocation canary — checks for O(N^2) loops, database N+1 query patterns, memory leaks (unbounded collections), and blocking calls in main event loop. Triggers on keywords: "/scale-canary", "scale-canary", "performance audit", "scale audit".
---

# Scale Canary (Performance & Resource Allocation Audit)

<!-- SHARED:LANGUAGE_HEADER -->

Audit code for scalability issues, performance bottlenecks, and resource leaks.

## Auditing Categories
1. **O(N^2) Complexity** — Nested loops over growable collections without indexing or caching (causes performance crashes at scale).
2. **N+1 Database Queries** — Querying database records in a loop instead of performing a batch J-Join or using bulk prefetching.
3. **Memory Bloat / Leaks** — Appending data to global arrays or maps without clearing them, leading to unbounded memory growth.
4. **Blocking Main Loop** — Performing synchronous file system operations or CPU-heavy calculations in the main event thread (causes lag/hangs).
5. **Resource Leakage** — Leaving streams, connections, or file handles open without closing them inside a `finally` block.

## Contexts & Execution Modes

- **Hook Context (Non-Interactive / Stop-Hook):** Run in report-only mode (QUICK depth) on touched files. Output a brief severity table. Do not modify files.
- **Agent Context (Interactive / Chat):** If issues are found, you **MUST** call the `ask_question` tool (if supported) to prompt the user.

## Fix mode (choice-gated)

In **Agent Context**, after presenting the audit report, call `ask_question` to present the following options (localized to user's active language):

- **Apply safe optimizations:** Replace synchronous file operations with asynchronous ones, and insert `finally` blocks for stream closing.
- **Let me pick:** Allow the user to select specific optimizations.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | bottleneck | severity | finding | optimization plan |`

Severity: CRITICAL (O(N^2) on user-facing API / unclosed file handles) · HIGH (N+1 query pattern / blocking main loop) · MEDIUM (unbounded cache grow) · LOW (minor efficiency suggestions)

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume, performance risk breadth, criticality), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just file count):**
- Small scope · few bottleneck types · non-critical → recommend **Light**
- Medium scope · multiple categories → recommend **Standard**
- Large scope · all 5 categories · performance-critical · pre-launch → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

