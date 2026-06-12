---
name: source-grounding
description: >-
  Verify version-sensitive facts against live authoritative sources before asserting them in code or answers. Triggers on: "/source-grounding", "source-grounding", "sourcing". Standing rule — always active via CLAUDE.md. Invoke for deep verification work (API signatures, CVEs, model IDs, auth flows, deprecated patterns, security advisories).
---

# Source Grounding

<!-- SHARED:LANGUAGE_HEADER -->

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

<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->
