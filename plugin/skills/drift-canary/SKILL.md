---
name: drift-canary
description: >-
  Compatibility and schema drift canary — checks for database schema migration safety, breaking API contract changes, serializable payload mismatches, and backward compatibility drift. Triggers on keywords: "/drift-canary", "drift-canary", "contract drift", "breaking changes". Use when changing DB schemas, API contracts, serialized payloads, or required config keys.
---

# Drift Canary (Contract & Schema Drift Audit)

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Audit code to ensure changes do not break backward compatibility or cause database/API mismatches.

## Auditing Categories
1. **Breaking Schema Migrations** — Database schema edits that drop columns, change types, or add non-null columns without defaults (causes crashes during deployments).
2. **API Contract breaking changes** — Modifying existing REST/GraphQL properties, removing API endpoints, or adding required query fields that break old clients.
3. **Serialization mismatches** — Editing properties in serialized data payloads (JSON, Protobuf, XML) without maintaining deserialization fallbacks.
4. **Library Contract Drift** — Changing the signature of public methods in a shared library without maintaining deprecated wrappers.
5. **Environment Configuration drift** — Introducing new required configuration keys (`.env` or OS variables) without providing defaults or fallback logic.

Expand/contract migration rules, per-format serialization fallbacks, and the breaking-vs-additive API checklist: read `references/checks.md` before scanning.

## Discipline
- **Style Drift Resolution (applies in Fix mode):** when an approved compatibility fix touches an area where multiple code styles are mixed, conform the minority patterns to the most dominant/frequent style (highest average usage) in the project to minimize churn — never start a standalone style refactor. (เรื่อง Style Drift ถ้ามีการปนเปกันมาก ๆ ให้เลือกใช้อันที่เฉลี่ยเยอะสุด ๆ เสมอ)

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

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories/dimensions/aspects relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** if the scope was already audited ≥Standard this session, cap the recommendation at Light regardless of the base score — re-auditing fresh ground wastes tokens; scope the run to what changed since. An explicit user tier request always overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. If the session is interactive (a user is present), offer the fix menu after the report; truly non-interactive runs stay report-only. Never fix without a chosen option.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).

**Self error-report:** if this skill itself misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a summary the user has reviewed — never auto-submit, never include unapproved code or paths.

**Entanglement:** after delivering the report, if confirmed findings fall in another canary's domain, offer that canary once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

