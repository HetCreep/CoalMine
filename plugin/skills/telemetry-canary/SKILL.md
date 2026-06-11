---
name: telemetry-canary
description: >-
  Observability and structured logging canary — checks for structured logs (JSON), OpenTelemetry metrics/traces, proper error stack traces, and flags empty catches or silent log swallowing. Triggers on keywords: "/telemetry-canary", "telemetry-canary", "observability audit", "structured logging". Use when adding or changing logging, metrics, tracing, or error-handling code.
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

Per-stack grep patterns and right/wrong shapes for every category: read `references/checks.md` before scanning.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe logs:** Insert missing error logging to empty catch blocks (using a standard logger template) and add stack trace mapping.
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

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.

