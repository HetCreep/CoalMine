---
name: source-grounding
description: Ground answers and decisions in real sources instead of raw model memory. Decide per question whether to go to the AUTHORITATIVE source (one ground truth — code/docs/spec) or TRIANGULATE diverse sources, and how hard to verify (strictness). Anti-hallucination. Use before asserting anything version/API/config/security/recent/"what's best", when the user says "are you sure / verify / don't guess / check the real source", or when accuracy matters more than speed.
---

# Source Grounding

Ground claims in real sources, not raw memory. Per question, choose **AUTHORITATIVE** (one ground truth) vs **DIVERSE** (triangulate many) — and verify in proportion to the stakes. The job: stop confident-but-wrong answers that come from stale or hallucinated memory.

## When to use
Before answering or acting where being wrong matters and the truth lives OUTSIDE the model: APIs, versions, configs, flags, specs, security, library behavior, "what's current / best", exemplars, recent events — or whenever the user asks you to verify / not guess.

## Strictness (the toggle)
This is a skill the agent uses *while reasoning* — it has no auto/manual/off (it doesn't fire by itself). Its one control is **how hard to verify**. Set per-invocation, or via a persistent default file `~/.claude/.grounding-mode` (one word; absent = balanced):

| Level | Behavior |
|---|---|
| **strict** | Verify EVERYTHING from a primary/authoritative source before asserting. Never present memory as fact. Flag every unverified claim. (max accuracy, more fetches) |
| **balanced** (default) | Verify anything version-sensitive / security / recent / high-stakes. Memory OK for stable, well-known facts — but flag if version-sensitive. |
| **fast** | Lean on memory unless clearly version/security-sensitive. Minimal fetching. (fastest, riskiest — low-stakes only) |

## Pick the mode (per question)
| Question type | Mode | Go to |
|---|---|---|
| fact / API / version / config / spec / "how does X actually work" | **AUTHORITATIVE** (one ground truth) | the actual source code / repo · official docs · the spec / RFC |
| landscape / "what's best" / options / patterns / opinion / survey | **DIVERSE** (triangulate ≥ 3) | multiple repos · multiple docs · multiple maintainers — cross-check, surface disagreement |
| stable + well-known + low-stakes | **MEMORY** (per strictness) | training — but flag if version-sensitive |

## Precision hierarchy (prefer the highest you can reach)
1. The actual **source code / spec / RFC** — primary ground truth
2. **Official / vendor docs** — authoritative secondary
3. **Multiple reputable third-party** sources — triangulated
4. A **single third-party blog** — weak; corroborate before trusting
5. **Training memory** — weakest for volatile facts; verify per strictness

## How to fetch (use the host's tools; degrade gracefully if absent)
- **AUTHORITATIVE** → read the project's own source first; else official docs (a docs MCP / vendor site); else the spec. Prefer the **primary** artifact (the code/spec) over a paraphrase of it.
- **DIVERSE** → repo/code search + multiple docs + web; triangulate; report where sources agree vs conflict + which you trust most + why.
- **No fetch tool available** → say so; answer "from memory — **UNVERIFIED**, verify before relying," and name exactly what to check and where.

## Discipline (non-negotiable)
- Never present memory as verified fact for version / API / security / recent topics — fetch, or flag it unverified.
- DIVERSE: ≥ 3 independent sources; note conflicts; don't cherry-pick the one that fits your prior.
- AUTHORITATIVE: go to the PRIMARY (the code/spec itself), not a blog's summary of it.
- **Cite every source** used + a confidence level. Separate "✅ verified from `<source>`" vs "⚠️ from memory (unverified)".
- Match effort to stakes (strictness) — but a wrong high-stakes answer from memory is exactly the failure this skill exists to prevent.

## Output
- The answer / claim.
- For each non-trivial fact: **source** (link or file path) · ✅ verified / ⚠️ unverified · confidence.
- DIVERSE: the sources + agreement/conflict + your call.
- What you could **NOT** verify, and how the user can.

## Sub-agents (when the host supports them)
For a broad grounding task: fan out **one source (or sub-topic) per worker** — each returns its finding + source + confidence; synthesize, then an adversarial pass flags any claim left unsourced. Single-model / no sub-agents → inline. (Mirrors the model-aware fan-out in the `gold-standard` / `rotcanary` skills.)

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.

## Language
Write the report and all prose in **the user's language** — match whatever language they are conversing in (Thai -> Thai, etc.). Keep code, file paths, identifiers, commands, error text, and technical terms verbatim — never translate those.
