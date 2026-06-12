---
name: telemetry-canary
description: >-
  Observability and structured logging canary — checks for structured logs (JSON), OpenTelemetry metrics/traces, proper error stack traces, and flags empty catches or silent log swallowing. Triggers on keywords: "/telemetry-canary", "telemetry-canary", "observability audit", "structured logging". Use when adding or changing logging, metrics, tracing, or error-handling code.
---

# Telemetry Canary (Observability & Logging Audit)

<!-- SHARED:LANGUAGE_HEADER -->

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

## Output
`| file:line | category | severity | finding | recommendation |`

Severity: CRITICAL (swallowed error with state mutation) · HIGH (missing stack trace in error logs) · MEDIUM (unstructured log in API boundary) · LOW (minor trace gaps)

<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

