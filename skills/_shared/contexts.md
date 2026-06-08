## Contexts & Execution Modes

**Hook Context (Non-Interactive / Stop-Hook / PostToolUse):**
Run in report-only mode. Do not modify files. Skip `ask_question`. Auto-select Light tier.
**No sub-agents. Never spawn.** Spawning from hook context risks infinite loops (PostToolUse → spawn → tool call → PostToolUse → …) and violates Commandment #3 (Zero Latency ≤5ms) and Commandment #5 (Zero Side-effects).

**Agent Context (Interactive / Chat / Manual):**
After scope assessment, call `ask_question` with 3 tier options (localized to user's language). Do not start work until user confirms. In Heavy tier, spawn sub-agents at maximum capacity if your platform supports it.

**Work Execution Gate (Agent Context only):**
After agreeing on any significant task, present `ask_question` with exactly 3 options (localized):

- **ทำทันที / Do now** — Assess scope → recommend tier → ask_question (Light / Standard / Heavy) → execute. Spawn sub-agents if platform supports it and tier warrants it.
- **เก็บเข้าแผนงาน / Add to plan** — Record task in task.md (no tier yet). Continue conversation. Tier is decided later at execution time.
- **ดูแผนงานทั้งหมด / View full plan** — Show all queued tasks as a simple table. AI calculates recommended tier for each. User may adjust any tier and select which to run.

  ```
  | #  | งาน / Task     | รายละเอียด      | Tier แนะนำ |
  |----|----------------|-----------------|------------|
  |  1 | [task name]    | [brief summary] | Heavy ✓    |
  |  2 | [task name]    | [brief summary] | Light ✓    |
  ```
  User adjusts e.g. "งาน 1=Standard" then selects which to execute.

**Haldane Safety Protocol (when spawning sub-agents):**
1. Before spawning: check task.md for in-flight files. Never spawn a second sub-agent to the same file.
2. Immediately after spawning: mark affected files as `[/] in-flight` in task.md.
3. If the conversation moves to a topic that may touch in-flight files: notify user before proceeding.
4. Clear in-flight only after sub-agent confirms completion.

**Proactive On-Demand Suggestions (Agent Context only):**
Monitor the conversation for topics or code changes relevant to the 6 On-demand canaries. Proactively trigger the `ask_question` tool with 3 options (Run Now, Queue to Plan, Skip) for the relevant canary, rather than typing a plain-text question in the chat. This ensures the user is fully aware and can interactively select the action. Trigger conditions:
- Adding/updating packages/dependencies → trigger `/supply-chain-audit` option
- Adding APIs, database tables, or schema changes → trigger `/drift-canary` option
- Asynchronous calls, network inputs, or retry/rollback logic → trigger `/resilience-audit` option
- Complex loops, deep database queries, or performance critical paths → trigger `/scale-canary` option
- Creating/modifying test infrastructure or refactoring coupling → trigger `/testability-canary` option
- Implementing monitoring, logging, metrics, or telemetry → trigger `/telemetry-canary` option
