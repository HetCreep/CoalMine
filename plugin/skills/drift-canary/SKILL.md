---
name: drift-canary
description: >-
  Compatibility and schema drift canary — checks for database schema migration safety, breaking API contract changes, serializable payload mismatches, and backward compatibility drift. Triggers on keywords: "/drift-canary", "drift-canary", "contract drift", "breaking changes".
---

# Drift Canary (Contract & Schema Drift Audit)

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Audit code to ensure changes do not break backward compatibility or cause database/API mismatches.

## Auditing Categories
1. **Breaking Schema Migrations** — Database schema edits that drop columns, change types, or add non-null columns without defaults (causes crashes during deployments).
2. **API Contract breaking changes** — Modifying existing REST/GraphQL properties, removing API endpoints, or adding required query fields that break old clients.
3. **Serialization mismatches** — Editing properties in serialized data payloads (JSON, Protobuf, XML) without maintaining deserialization fallbacks.
4. **Library Contract Drift** — Changing the signature of public methods in a shared library without maintaining deprecated wrappers.
5. **Environment Configuration drift** — Introducing new required configuration keys (`.env` or OS variables) without providing defaults or fallback logic.

## Discipline
- **Style Drift Resolution:** When resolving style or pattern inconsistencies (Style Drift), if multiple styles are mixed, always conform the minority patterns to match the most dominant/frequent style (highest average usage) in the project to minimize churn. (เรื่อง Style Drift ถ้ามีการปนเปกันมาก ๆ ให้เลือกใช้อันที่เฉลี่ยเยอะสุด ๆ เสมอ)

## Contexts & Execution Modes

- **Hook Context (Non-Interactive / Stop-Hook):** Run in report-only mode (QUICK depth) on touched files. Output a brief severity table. Do not modify files.
- **Agent Context (Interactive / Chat):** If issues are found, you **MUST** call the `ask_question` tool (if supported) to prompt the user.

## Fix mode (choice-gated)

In **Agent Context**, after presenting the audit report, call `ask_question` to present the following options (localized to user's active language):

- **Apply safe deprecations:** Mark API endpoints/methods as deprecated and add backward-compatibility mapping wrappers.
- **Let me pick:** Allow the user to select specific compatibility fixes.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | contract interface | severity | finding | migration path |`

Severity: CRITICAL (breaking DB schema mutation / breaking API change) · HIGH (serialization type change) · MEDIUM (unmapped new required env key) · LOW (missing deprecation doc)

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume, contract risk breadth, criticality), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just file count):**
- Small scope · few drift categories · non-critical → recommend **Light**
- Medium scope · multiple categories → recommend **Standard**
- Large scope · all 5 categories · breaking-change review · pre-release → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot contract check, key interfaces only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced drift audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial compatibility verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (Interactive):** Call `ask_question` after scope assessment. Do not start work until user confirms.

**Hook Context (Non-Interactive / Stop-Hook):** Auto-select Light. Skip `ask_question`. Run report-only, no fixes. No sub-agents.

**`ask_question` = your platform's interactive question tool**, whatever its real name: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo Code `ask_followup_question` · GitHub Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in question prompts. If your platform has no such tool (e.g. Goose), present the same options as a numbered text list and wait for the user's reply.

**Heavy Durability (long multi-agent runs):**
- Chunk the run into short orchestration phases (each completing within minutes) and read results between phases — one long-running orchestration is one session interruption away from losing all in-flight work.
- If an orchestration dies mid-run (session restart/kill), recover before re-running: completed sub-agent results usually survive in your platform's run records (run journal, resumable run ID, or per-agent transcripts) — re-spawn only the missing pieces.

