---
name: source-grounding
description: >-
  Verify version-sensitive facts against live authoritative sources before asserting them in code or answers. Triggers on: "/source-grounding", "source-grounding", "sourcing". Standing rule — always active via CLAUDE.md. Invoke for deep verification work (API signatures, CVEs, model IDs, auth flows, deprecated patterns, security advisories).
---

# Source Grounding

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

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

Per-claim-type authoritative source map: read `references/sources.md` when choosing where to verify.

## Source hierarchy
1. Source code / spec / RFC — primary ground truth
2. Official/vendor docs — authoritative secondary (honor `.coalmine.json` `trustedDomains` if set: treat those domains as additional authoritative / tier-2 sources)
3. Multiple reputable third-party sources — triangulated
4. Single blog — weak; corroborate first
5. Training memory — weakest for volatile facts

Non-interactive runs: log unfetchable claims as `⚠️ UNVERIFIED` and continue — never block. Interactive: when sources cannot be fetched, confirm how to proceed via `ask_question`.

## Output
- Verified: `✅ [claim] — source: [link/file]`
- Unverified: `⚠️ unverified — check [exact source]`
- Stable fact: no annotation needed

## AUTHORITATIVE vs DIVERSE
- **AUTHORITATIVE** (one ground truth): API/version/config/spec → go to the actual source code or official docs.
- **DIVERSE** (triangulate ≥ 3): "what's best" / landscape / patterns → multiple repos + docs + community; note conflicts.

## Escalation — Scope & Model Quality

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. No lever for one? **Degrade gracefully — never fake parallelism you can't do**; escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Cost |
|---|---|---|---|
| **Light** | Spot-check key claims, single source | Cheapest model · single agent, no sub-agents. | Low |
| **Standard** | Balanced verification, mixed sources | Balanced model · raised reasoning · sub-agents per category **only if your platform runs concurrent workers** (else single-agent). | Balanced |
| **Heavy** | Full cross-verification, adversarial check | Most capable model + largest context · deepest reasoning · max sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

Per-platform Heavy levers + Heavy-run durability: read `references/escalation.md` before a Heavy run. No concurrent fan-out on your host → escalate by model + reasoning only.

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the pick marked `✓`, score shown, labels localized — and wait for the choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Copilot `askQuestions` · Gemini CLI `ask_user` (business-tier product; individual tiers ended 2026-06-18 → Antigravity CLI) · Codex `request_user_input` · Cursor/Devin Desktop (ex-Windsurf)/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** scope already audited ≥Standard this session → cap at Light (re-auditing fresh ground wastes tokens; scope to what changed). **Default tier:** honor `.coalmine.json` `defaultTier` unless the user requests a tier for that run — an explicit request overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. Interactive session (a user is present) → offer the fix menu after the report; non-interactive → report-only. Never fix without a chosen option.

**Entanglement:** after the report, if confirmed findings fall in another canary's domain, offer it once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

**Self error-report:** if this skill misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a user-reviewed summary — never auto-submit, never include unapproved code or paths.
