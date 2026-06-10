---
name: telemetry-canary
description: >-
  Observability and structured logging canary — checks for structured logs (JSON), OpenTelemetry metrics/traces, proper error stack traces, and flags empty catches or silent log swallowing. Triggers on keywords: "/telemetry-canary", "telemetry-canary", "observability audit", "structured logging".
---

# Telemetry Canary (Observability & Logging Audit)

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Audit code for proper telemetry instrumentation. Ensure the application is not a black box in production.

## Auditing Categories
1. **Empty / Silent Catch** — Catch blocks that swallow exceptions without logging a stack trace or forwarding the error (violates visibility).
2. **Unstructured Logs** — Plain-string logging in server code (recommend JSON or structured key-value formats for cloud queries).
3. **No Correlation ID** — Operations traversing boundaries (HTTP/gRPC/threads) without propagating a trace/correlation ID.
4. **Missing Metrics** — Critical business transactions (e.g., checkouts, auth, errors) that lack counter/histogram instrumentation.
5. **No Stack Traces** — Errors logged without stack context (e.g., `logger.error(e.message)` instead of passing the entire error object `logger.error(e)`).

## Contexts & Execution Modes

- **Hook Context (Non-Interactive / Stop-Hook):** Run in report-only mode (QUICK depth) on touched files. Output a brief severity table of gaps. Do not modify files.
- **Agent Context (Interactive / Chat):** If issues are found, you **MUST** call the `ask_question` tool (if supported) to prompt the user for fixes.

## Fix mode (choice-gated)

In **Agent Context**, after presenting the audit report, call `ask_question` to present the following options (localized to user's active language):

- **Apply safe logs:** Insert missing error logging to empty catch blocks (using a standard logger template) and add stack trace mapping.
- **Let me pick:** Allow the user to select which telemetry gaps to resolve.
- **Report only:** Exit without making changes.

## Output Format
`| file:line | category | severity | finding | recommendation |`

Severity: CRITICAL (swallowed error with state mutation) · HIGH (missing stack trace in error logs) · MEDIUM (unstructured log in API boundary) · LOW (minor trace gaps)

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume, instrumentation gap breadth, criticality), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just file count):**
- Small scope · few gap types · non-critical → recommend **Light**
- Medium scope · multiple categories → recommend **Standard**
- Large scope · all 5 categories · release · observability-critical → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot telemetry check, key paths only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced observability audit, multi-category | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 5-category audit + adversarial verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (Interactive):** Call `ask_question` after scope assessment. Do not start work until user confirms.

**Hook Context (Non-Interactive / Stop-Hook):** Auto-select Light. Skip `ask_question`. Run report-only, no fixes. No sub-agents.

