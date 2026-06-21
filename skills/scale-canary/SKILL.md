---
name: scale-canary
description: >-
  Performance complexity and resource allocation canary — checks for O(N^2) loops, database N+1 query patterns, memory leaks (unbounded collections), and blocking calls in main event loop. Triggers on keywords: "/scale-canary", "scale-canary", "performance audit", "scale audit". Use when writing loops over growing data, DB queries, caches, or async/event-loop code.
---

# Scale Canary (Performance & Resource Allocation Audit)

<!-- SHARED:LANGUAGE_HEADER -->

Audit code for scalability issues, performance bottlenecks, and resource leaks.

## Auditing Categories
1. **O(N^2) Complexity** — nested loops over growable collections without indexing or caching (crashes at scale).
2. **N+1 Database Queries** — querying records in a loop instead of a batch JOIN or bulk prefetch.
3. **Memory Bloat / Leaks** — appending to global arrays/maps without clearing them → unbounded growth.
4. **Blocking Main Loop** — synchronous FS ops or CPU-heavy work on the main event thread (lag/hangs).
5. **Resource Leakage** — streams, connections, or handles left open without a `finally` close.

Per-ORM N+1 shapes, per-stack blocking patterns, and what NOT to flag: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the report, present via `ask_question`:

- **Apply safe optimizations:** async-ify synchronous file ops; insert `finally` blocks for stream closing.
- **Let me pick:** user selects specific optimizations.
- **Report only:** exit unchanged.

## Output
`| file:line | bottleneck | severity | finding | optimization plan |`

Severity: CRITICAL (O(N^2) on user-facing API / unclosed file handles) · HIGH (N+1 query pattern / blocking main loop) · MEDIUM (unbounded cache growth) · LOW (minor efficiency suggestions)

<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

