---
name: source-grounding
description: >-
  Verify version-sensitive facts against live authoritative sources before asserting them in code or answers. Triggers on: "/source-grounding", "source-grounding", "sourcing". Standing rule — always active via CLAUDE.md. Invoke for deep verification work (API signatures, CVEs, model IDs, auth flows, deprecated patterns, security advisories).
---

# Source Grounding

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Standing rule — active every response. No invocation needed for routine use.

## What to verify (not memory)
- **CRITICAL** (always fetch or flag): API/SDK call signatures · library versions & deprecations · CVEs/security advisories · auth/crypto specs · LLM model IDs & params
- **MEDIUM** (verify when unsure): package names · config keys · CLI flags · protocol specs
- **LOW/stable**: math, algorithms, language syntax → memory fine

## How
1. Identify the version-sensitive claim.
2. Name the authoritative source (official docs, advisory DB, package registry, spec, source code).
3. Fetch (WebSearch/WebFetch/docs MCP) — or flag `⚠️ unverified: check [source]`.
4. Cite at CRITICAL/MEDIUM. Don't over-verify stable facts.

## Source hierarchy
1. Source code / spec / RFC — primary ground truth
2. Official/vendor docs — authoritative secondary
3. Multiple reputable third-party sources — triangulated
4. Single blog — weak; corroborate first
5. Training memory — weakest for volatile facts

## Contexts & Execution Modes

- **Hook Context (Non-Interactive):** When triggered automatically or as a background task, log unverified claims encountered as `⚠️ UNVERIFIED` entries in the output without blocking execution.
- **Agent Context (Interactive / Chat):** When invoked in chat, you **MUST** use the `ask_question` tool (if supported, otherwise text prompt) to present the findings and confirm how to proceed when sources cannot be fetched at that moment.

## Output
- Verified: `✅ [claim] — source: [link/file]`
- Unverified: `⚠️ unverified — check [exact source]`
- Stable fact: no annotation needed

## AUTHORITATIVE vs DIVERSE
- **AUTHORITATIVE** (one ground truth): API/version/config/spec → go to the actual source code or official docs.
- **DIVERSE** (triangulate ≥ 3): "what's best" / landscape / patterns → multiple repos + docs + community; note conflicts.

## Escalation — Scope & Model Quality

**Before starting**, assess scope (volume of claims, source complexity, criticality), then call `ask_question` once with 3 options (localized to user's language). Mark the recommended option `✓` dynamically based on your assessment — never hardcode the recommendation.

**Recommendation logic (use judgment, not just claim count):**
- Few claims · single source type · non-critical → recommend **Light**
- Multiple claims · mixed sources · moderate complexity → recommend **Standard**
- Many claims · CVE cross-check · security-critical · release → recommend **Heavy**

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot-check key claims, single source | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced verification, mixed sources | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full cross-verification, adversarial check | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (Interactive):** Call `ask_question` after scope assessment. Do not start work until user confirms.

**Hook Context (Non-Interactive / Stop-Hook):** Auto-select Light. Skip `ask_question`. Run report-only, no fixes. No sub-agents.
