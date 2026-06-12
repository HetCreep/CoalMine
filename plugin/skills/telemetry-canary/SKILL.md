---
name: telemetry-canary
description: >-
  Observability and structured logging canary — checks for structured logs (JSON), OpenTelemetry metrics/traces, proper error stack traces, and flags empty catches or silent log swallowing. Triggers on keywords: "/telemetry-canary", "telemetry-canary", "observability audit", "structured logging". Use when adding or changing logging, metrics, tracing, or error-handling code.
---

# Telemetry Canary (Observability & Logging Audit)

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Audit code for proper telemetry instrumentation. Ensure the application is not a black box in production.

## Auditing Categories
1. **Empty / Silent Catch** — Catch blocks that swallow exceptions without logging a stack trace or forwarding the error (violates visibility).
2. **Unstructured Logs** — Plain-string logging in server code (recommend JSON or structured key-value formats for cloud queries).
3. **No Correlation ID** — Operations traversing boundaries (HTTP/gRPC/threads) without propagating a trace/correlation ID.
4. **Missing Metrics** — Critical business transactions (e.g., checkouts, auth, errors) that lack counter/histogram instrumentation.
5. **No Stack Traces** — Errors logged without stack context (e.g., `logger.error(e.message)` instead of passing the entire error object `logger.error(e)`).

Per-stack grep patterns and right/wrong shapes for every category: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe logs:** Insert missing error logging into empty catch blocks (using a standard logger template) and add stack trace mapping.
- **Let me pick:** Allow the user to select which telemetry gaps to resolve.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | category | severity | finding | recommendation |`

Severity: CRITICAL (swallowed error with state mutation) · HIGH (missing stack trace in error logs) · MEDIUM (unstructured log in API boundary) · LOW (minor trace gaps)

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot telemetry check, key paths only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced observability audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes ⑤ scope not already audited ≥Standard this session. **0–1 Light · 2–3 Standard · 4–5 Heavy.** An explicit user tier request always overrides.

**Hook Context (non-interactive):** auto-Light, report-only — no questions, no fixes, no sub-agents.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).

**Entanglement:** after delivering the report, if confirmed findings fall in another canary's domain, offer that canary once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

