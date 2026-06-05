---
name: gold-standard
description: World-class completeness audit — given a project and its function, judge whether its rules, standards, and features are complete versus the best-in-class programs in its category. Names the bar (cited exemplars), derives the 100% checklist, scores by dimension, lists prioritized gaps — then, on request, FILLS the missing rules into the project's rules home (each citing its exemplar) and ADOPTS the completed ruleset as a binding compliance gate for further work. Use to answer "are our rules/standards 100% vs world-class — and if not, complete them and work by them." Fills rules, not code; can then CONFORM existing code to the adopted rules (offered as a selectable choice). Code changes always need approval.
---

# Gold Standard — world-class completeness audit

Answer one question rigorously:

> **"For a project that does THIS, measured against the best-in-class programs in its category — are the rules / standards / features 100% complete? If not, what's missing?"**

Four acts, stop at any: **audit** the gap → **fill** the missing rules → **adopt** them as binding → **conform** the existing code to them. Filling writes RULES / standards (not code); conform + any code change still needs the user's go.

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

## Actions — audit → fill → adopt → conform
Up to four acts; stop at any. The first three complete + bind the rules; CONFORM extends them onto the existing code.

1. **AUDIT** (default) — score the gaps vs the bar (Method + Output above).
2. **FILL** — author the missing **MUST-HAVE** rules/standards into the project's rules home, in its existing style + voice, each citing the exemplar that justifies it — **grounded in the exemplar's authoritative source** (invoke source-grounding: cite the real doc/spec/standard, never memory). Writes RULES/standards docs — does **not** change code.
   - Rules home (detect, first that exists): `.claude/rules/**` · `AGENTS.md` / `CLAUDE.md` · `CONTRIBUTING.md` / `STANDARDS.md` / `docs/` — else create `STANDARDS.md`. **Extend** existing rules; never duplicate one already present. Match the project's format.
   - After filling, restate (or link) the now-complete ruleset so it can be adopted.
3. **ADOPT** — treat the completed ruleset as **binding** for the rest of the session: every subsequent change must pass it (a compliance gate, like `AGENTS.md`'s). Re-audit after major changes. Code work still follows the normal flow (propose → user approves) — adoption governs *how* you work, it does not license auto-editing code.
4. **CONFORM** (retrofit existing code) — adoption binds *future* work only; the existing codebase may still violate the new rules. After ADOPT, **offer this as a selectable choice** (use the host's choice UI — e.g. AskUserQuestion — not a free-text question):
   - **Conform now** — scan the existing project against the adopted ruleset, report each violation (`path:line` · rule · evidence), then fix **on approval**, each through the fix-mode safety harness: **checkpoint first** (git branch/commit; stash if dirty) → **one fix → re-run build + covering tests** → **verify-loop** (green ⇒ keep · red ⇒ auto-revert + downgrade to report-only) → **diff summary** at the end. (No git / no restore point → don't auto-apply; report-only. If any harness step fails → stop, restore the checkpoint, report — don't keep applying.)
   - **Report only** — list the violations; change nothing.
   - **Skip** — forward-only; leave existing code as-is.
   Conform/Report = a **rule-driven** scan (criteria = the adopted rules, not generic categories). Proportional: QUICK = the files a rule plausibly touches · DEEP = whole repo; on a sub-agent host, fan out one rule (or rule-group) per worker. **Never auto-fix code** — every fix needs approval.

Triggers: "audit / are we 100%" → AUDIT · "fill in / complete the rules" → FILL · "work by these rules / follow them from now on" → ADOPT · "fix the old code to the rules / conform / retrofit" → CONFORM. Asking the full question usually means: AUDIT → offer FILL → ADOPT → then offer CONFORM (as a selectable choice).

**One-shot (command → fill → ready to work):** when the user wants it in one go ("complete the rules and proceed" / `ACTION=fill-adopt`), run AUDIT (quick) → FILL the must-have gaps → post a SHORT "rules added" summary (visible, not silent — a wrong rule gets caught) → ADOPT as binding → continue straight into the task. No blocking confirm; the summary is the review window.

## Depth scaling
- **QUICK** — must-have checklist + top gaps + overall score; skip the excellence tier.
- **DEEP** — full matrix (must + excellence) + per-dimension scores + a 100%-roadmap. On hosts with a sub-agent system, fan out **one dimension per worker** (cheap model for checklist-matching dimensions like docs/licensing; strong model for security / correctness / distribution-integrity judgment), then synthesize + an adversarial pass that challenges any score above 90% ("prove it's really that complete").

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.

## Language
Write the report and all prose in **the user's language** — match whatever language they are conversing in (Thai -> Thai, etc.). Keep code, file paths, identifiers, commands, error text, and technical terms verbatim — never translate those.
