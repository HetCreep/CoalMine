---
name: source-grounding
description: >-
  Verify version-sensitive facts against live authoritative sources before asserting them in code or answers. Triggers on: "/source-grounding", "source-grounding", "sourcing". Standing rule — always active via CLAUDE.md. Invoke for deep verification work (API signatures, CVEs, model IDs, auth flows, deprecated patterns, security advisories).
---

# Source Grounding

<!-- SHARED:LANGUAGE_HEADER -->

Standing rule — active every response. No invocation needed for routine use.

## Consent gates (G1–G4, declared)
| # | what it gates | when it fires | Agent lane | Hook lane |
|---|---|---|---|---|
| G1 | model tier | before work starts | `ask_question`, 3 tiers, wait for pick | suppressed — auto-Light, no tier question |
| G2 | how to proceed on an unfetchable source | source can't be fetched, user present | `ask_question` | `ask_question` |
| G3 | entanglement hand-off | after the findings, cross-domain | `ask_question`, once | `ask_question`, once |
| G4 | self error-report | skill misbehaves | offer, never auto-submit | offer, never auto-submit |

Hook cells assume an interactive session (G2–G4 need a user to answer); non-interactive Hook fires D1 instead of G2, and offers nothing for G3/G4.

## What to verify (not memory)
- **CRITICAL** (always fetch or flag — P2): API/SDK call signatures · library versions & deprecations · CVEs/security advisories · auth/crypto specs · LLM model IDs & params
- **MEDIUM** (verify when unsure): package names · config keys · CLI flags · protocol specs
- **LOW/stable**: math, algorithms, language syntax → memory fine (P3)

## How
1. Identify the version-sensitive claim.
2. Name the authoritative source (official docs, advisory DB, package registry, spec, source code).
3. Fetch (WebSearch/WebFetch/docs MCP) — or flag `⚠️ unverified: check [source]` (D1).
4. Cite at CRITICAL/MEDIUM. Don't over-verify stable facts (P3).

Per-claim-type authoritative source map: read `references/sources.md` when choosing where to verify.

## Source hierarchy (1 = strongest)
1. Source code / spec / RFC
2. Official/vendor docs — authoritative secondary (honor `.coalmine.json` `trustedDomains` if set: treat those domains as additional authoritative / tier-2 sources)
3. Multiple reputable third-party sources
4. Single blog — corroborate first (P4)
5. Training memory — weakest for volatile facts

Why each rank sits where it does: `references/sources.md`.

Non-interactive runs: log unfetchable claims as `⚠️ UNVERIFIED` and continue (D1). Interactive: when sources cannot be fetched, confirm how to proceed via `ask_question` (G2).

## Prohibitions (P1–P6, declared)
| # | never … |
|---|---|
| P1 | default to English just because this file is English |
| P2 | skip fetching or flagging a CRITICAL version-sensitive claim |
| P3 | over-verify a stable/LOW fact |
| P4 | cite a single blog source without corroborating first |
| P5 | auto-submit the self error-report |
| P6 | include unapproved code or paths in the self error-report |

The shared footer's `never fix without a chosen option` does not apply here — this skill defines no Fix mode section, so that clause resolves vacuously; not counted above.

## Degrade paths (D1–D4, declared)
| # | branch | condition | lane |
|---|---|---|---|
| D1 | log as `⚠️ UNVERIFIED`, continue, never block | non-interactive, source unfetchable | Hook only |
| D2 | degrade to model tier + reasoning depth, never fake parallelism | no capability lever for the target tier on this host | Agent only |
| D3 | fall back to a numbered text menu | host has no question tool | universal |
| D4 | fixed at Light, no tier question, no sub-agents | Hook Context (auto-triggered) | Hook only |

Lane audit, condition by condition: **D1 → Hook only** — its condition is "non-interactive", and Agent Context is interactive by definition (the footer's own Agent Context paragraph), so D1 can never fire there. **D2 → Agent only** — D4 fixes Hook at Light unconditionally, and Light needs no capability lever (it is the baseline: single agent, no sub-agents), so a Standard/Heavy lever gap can only arise where a non-Light tier is ever attempted, which is Agent (via G1) alone. **D3 stays universal** — it fires wherever `ask_question` would fire, which is Agent (always) and Hook (when interactive, per G2–G4's own footnote above) — the same both-lanes shape already established for those gates, not a new one. **D4 stays Hook only**, unconditional for the whole Hook lane. D2 restated at four sites — the general clause, the Standard row's "(else single-agent)", the Heavy row's "if supported", and the Heavy-specific "escalate by model + reasoning only" — one row, four mentions. The Freshness cap (scope already audited this session → cap at Light) is a tier-selection modifier on G1, not a degrade branch — no capability lever is missing and there is no unhappy path, so it stays out of D. The footer's Fix-mode-dependent offer clause is vacuous here either way (no Fix mode section to defer to).

## Output — 2 locations, declared
A location is a place this skill **writes** something a reader can see; the absence of an annotation is not one.
- Verified: `✅ [claim] — source: [link/file]`
- Unverified: `⚠️ unverified — check [exact source]`

Stable fact: no annotation is written — not a location, not counted above.

## AUTHORITATIVE vs DIVERSE
- **AUTHORITATIVE** (one ground truth): API/version/config/spec → go to the actual source code or official docs.
- **DIVERSE** (triangulate ≥ 3): "what's best" / landscape / patterns → multiple repos + docs + community; note conflicts.

<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->
