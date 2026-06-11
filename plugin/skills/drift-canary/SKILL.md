---
name: drift-canary
description: >-
  Compatibility and schema drift canary — checks for database schema migration safety, breaking API contract changes, serializable payload mismatches, and backward compatibility drift. Triggers on keywords: "/drift-canary", "drift-canary", "contract drift", "breaking changes". Use when changing DB schemas, API contracts, serialized payloads, or required config keys.
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

Expand/contract migration rules, per-format serialization fallbacks, and the breaking-vs-additive API checklist: read `references/checks.md` before scanning.

## Discipline
- **Style Drift Resolution (applies in Fix mode):** when an approved compatibility fix touches an area where multiple code styles are mixed, conform the minority patterns to the most dominant/frequent style (highest average usage) in the project to minimize churn — never start a style refactor of its own. (เรื่อง Style Drift ถ้ามีการปนเปกันมาก ๆ ให้เลือกใช้อันที่เฉลี่ยเยอะสุด ๆ เสมอ)

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe deprecations:** Mark API endpoints/methods as deprecated and add backward-compatibility mapping wrappers.
- **Let me pick:** Allow the user to select specific compatibility fixes.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | contract interface | severity | finding | migration path |`

Severity: CRITICAL (breaking DB schema mutation / breaking API change) · HIGH (serialization type change) · MEDIUM (unmapped new required env key) · LOW (missing deprecation doc)

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot contract check, key interfaces only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced drift audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial compatibility verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** assess scope, then call `ask_question` once with the 3 tiers — mark the recommended one `✓` by judgment (never hardcoded), localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.

