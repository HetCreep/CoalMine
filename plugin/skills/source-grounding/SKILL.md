---
name: source-grounding
description: >-
  Verify version-sensitive facts against live authoritative sources before asserting them in code or answers. Triggers on: "/source-grounding", "source-grounding", "sourcing". Standing rule — always active via CLAUDE.md. Invoke for deep verification work (API signatures, CVEs, model IDs, auth flows, deprecated patterns, security advisories).
---

# Source Grounding

**Language:** Mirror the user's current writing language for EVERYTHING you generate at runtime — questions, answer options and menu labels, tier recommendations, report narrative, and status messages. Detect from their messages (Thai → Thai, Japanese → Japanese, …); never hardcode one language, and never fall back to English just because this skill file is written in English. Technical terms MAY stay in English where translation would hurt precision: tool/command names, file paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

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

Non-interactive runs: log unfetchable claims as `⚠️ UNVERIFIED` and continue — never block. Interactive: when sources cannot be fetched, confirm how to proceed via `ask_question`.

## Output
- Verified: `✅ [claim] — source: [link/file]`
- Unverified: `⚠️ unverified — check [exact source]`
- Stable fact: no annotation needed

## AUTHORITATIVE vs DIVERSE
- **AUTHORITATIVE** (one ground truth): API/version/config/spec → go to the actual source code or official docs.
- **DIVERSE** (triangulate ≥ 3): "what's best" / landscape / patterns → multiple repos + docs + community; note conflicts.

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Spot-check key claims, single source | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced verification, mixed sources | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full cross-verification, adversarial check | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces. On Claude Code, fan out with the bundled `coalmine-scanner` agent (one per category/module — read-only, compressed table output).
