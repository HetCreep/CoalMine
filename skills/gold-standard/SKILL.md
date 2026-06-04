---
name: gold-standard
description: World-class completeness audit — given a project and its function, judge whether its rules, standards, and features are complete versus the best-in-class programs in its category. Names the bar (cited exemplars), derives the 100% checklist, scores by dimension, lists prioritized gaps — then, on request, FILLS the missing rules into the project's rules home (each citing its exemplar) and ADOPTS the completed ruleset as a binding compliance gate for further work. Use to answer "are our rules/standards 100% vs world-class — and if not, complete them and work by them." Fills rules, not code; code changes still need approval.
---

# Gold Standard — world-class completeness audit

Answer one question rigorously:

> **"For a project that does THIS, measured against the best-in-class programs in its category — are the rules / standards / features 100% complete? If not, what's missing?"**

Three acts, stop at any: **audit** the gap → **fill** the missing rules into the project's rule files → **adopt** them as binding. Filling writes RULES / standards (not code); code changes still need the user's go.

## Input (infer if not given)
- **PROJECT** — what it is + its core function. Read README / AGENTS / docs / code.
- **CATEGORY** — the class it competes in (package installer, code formatter, mod loader, CLI proxy, web framework, design system, …). State it; if ambiguous, pick the closest and say so.
- **LENS** — `standards` (rules / policies / practices — the default emphasis) | `features` (capabilities) | `both` (default).
- **DEPTH** — QUICK (table-stakes + top gaps) | DEEP (full per-dimension matrix + excellence tier).

## Method
1. **Name the bar.** List 3–5 world-class / best-in-class exemplars in the category that practitioners actually cite (e.g. package installers → npm · pnpm · Cargo · winget · apt). State them explicitly — the audit is only as honest as its bar. Niche category → borrow from the nearest mature neighbors and say which.
2. **Derive the 100% checklist.** Enumerate what those exemplars uphold, grouped by dimension (below). Split each criterion into **MUST-HAVE** (category table-stakes) vs **EXCELLENCE** (top-tier polish). Tie each to the exemplar that sets the bar.
3. **Audit the project** against every criterion → **✅ present / 🟡 partial / ❌ missing / N-A (out of scope)**. Cite project evidence (file, feature, doc, rule) for each call.
4. **Score.** Per-dimension % and overall %. 🟡 partial = half credit. N-A is EXCLUDED from the denominator — but every N-A MUST be justified (why it genuinely doesn't apply); an unjustified N-A is really a ❌.
5. **Gaps to 100%.** Prioritized: MUST-HAVEs first, then EXCELLENCE. Each gap: the criterion · the exemplar that has it · rough effort · why it matters.

## Dimensions (pick the ones that fit the category)
Correctness & reliability · Security & privacy · Performance & resource use · UX / DX · Documentation & onboarding · Testing & CI · Distribution / packaging / updates / integrity · Observability / logging / diagnostics · Accessibility & i18n (if user-facing) · Governance / licensing / community / contribution · Maintainability & code health · Compatibility & platform support · Error handling & recovery.

## Discipline (non-negotiable)
- **Don't inflate.** A real 100% is rare. If it's 85%, name the missing 15% concretely. A flattering score is a failed audit.
- **Cite the exemplar** for every criterion — "npm does X", "Cargo does Y". No unsourced "best practice".
- **Keep MUST-HAVE vs EXCELLENCE vs N-A distinct.** Justify each N-A; padding the score with silent N-As is forbidden.
- **State the bar + assumptions.** If the user rejects the chosen exemplars or category, redo with theirs.
- **No silent omission** — list the dimensions you did NOT assess and why.
- **Honor deliberate scope.** A feature the project intentionally + documentedly omits is N-A, not a gap — but say so explicitly.

## Output
1. **Bar** — category + the named exemplars (+ why them).
2. **Scorecard** — sorted by dimension:

   | dimension | criterion | tier (must / excellence) | exemplar | status | evidence |

3. **Scores** — per-dimension % + **overall %** (list the N-A exclusions).
4. **Gaps to 100%** — prioritized; each: criterion · exemplar · effort · impact.
5. **Verdict** — one line: how far from world-class, and the top 3 moves to close it.
6. **Not assessed** — dimensions skipped + why.

## Actions — audit → fill → adopt
Up to three acts; stop at any. The rules-completeness use case usually wants all three.

1. **AUDIT** (default) — score the gaps vs the bar (Method + Output above).
2. **FILL** — author the missing **MUST-HAVE** rules/standards into the project's rules home, in its existing style + voice, each citing the exemplar that justifies it — **grounded in the exemplar's authoritative source** (invoke source-grounding: cite the real doc/spec/standard, never memory). Writes RULES/standards docs — does **not** change code.
   - Rules home (detect, first that exists): `.claude/rules/**` · `AGENTS.md` / `CLAUDE.md` · `CONTRIBUTING.md` / `STANDARDS.md` / `docs/` — else create `STANDARDS.md`. **Extend** existing rules; never duplicate one already present. Match the project's format.
   - After filling, restate (or link) the now-complete ruleset so it can be adopted.
3. **ADOPT** — treat the completed ruleset as **binding** for the rest of the session: every subsequent change must pass it (a compliance gate, like `AGENTS.md`'s). Re-audit after major changes. Code work still follows the normal flow (propose → user approves) — adoption governs *how* you work, it does not license auto-editing code.

Triggers: "audit / are we 100%" → AUDIT · "fill in / complete the rules" → FILL · "work by these rules / follow them from now on" → ADOPT. Asking the full question usually means: AUDIT, then offer FILL → ADOPT.

**One-shot (command → fill → ready to work):** when the user wants it in one go ("complete the rules and proceed" / `ACTION=fill-adopt`), run AUDIT (quick) → FILL the must-have gaps → post a SHORT "rules added" summary (visible, not silent — a wrong rule gets caught) → ADOPT as binding → continue straight into the task. No blocking confirm; the summary is the review window.

## Depth scaling
- **QUICK** — must-have checklist + top gaps + overall score; skip the excellence tier.
- **DEEP** — full matrix (must + excellence) + per-dimension scores + a 100%-roadmap. On hosts with a sub-agent system, fan out **one dimension per worker** (cheap model for checklist-matching dimensions like docs/licensing; strong model for security / correctness / distribution-integrity judgment), then synthesize + an adversarial pass that challenges any score above 90% ("prove it's really that complete").

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.
