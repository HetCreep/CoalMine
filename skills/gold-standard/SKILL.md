---
name: gold-standard
description: World-class completeness audit — score a project's rules/standards/features against best-in-class exemplars, name the gaps, fill missing rules, adopt as binding, then offer to conform existing code. Triggers on keywords: "audit rules", "gold-standard", "are we world-class", "fill gaps", "complete our rules", "conform old code".
---

# Gold Standard

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Answer: **"For a project that does THIS — are rules/standards/features 100% vs world-class? If not, what's missing?"**

Four acts: **AUDIT** → **FILL** → **ADOPT** → **CONFORM**. Stop at any.

## Triggers
| Keyword | Act |
|---|---|
| "audit rules" / "gold-standard" / "are we world-class" | AUDIT |
| "fill gaps" / "complete our rules" | FILL |
| "work by these rules" / "follow from now on" | ADOPT |
| "conform old code" / "retrofit" | CONFORM |
| "fill and adopt" / `ACTION=fill-adopt` | AUDIT → FILL → summary → ADOPT → offer CONFORM |

## Acts
1. **AUDIT** — pick 3–5 named exemplars, derive the 100% checklist per dimension, score (✅/🟡/❌/N-A), give overall %.
2. **FILL** — write missing MUST-HAVE rules into project's rules home (`.claude/rules/` → `AGENTS.md` → `STANDARDS.md`). Match project style + voice. Cite the exemplar. Invoke source-grounding for version-sensitive claims. Extend existing; never duplicate.
3. **ADOPT** — treat completed ruleset as binding for rest of session. Code changes still need user approval — adoption governs *how* to work, not license to auto-edit.
4. **CONFORM** — scan existing code against adopted rules; report violations (`path:line` · rule · evidence). Fix on approval: checkpoint → one fix → build+tests → revert if newly red.

## Method
1. **Bar** — name 3–5 world-class exemplars + why them (cite real programs, not "best practices").
2. **Checklist** — MUST-HAVE (table-stakes) vs EXCELLENCE (top-tier polish). Each tied to an exemplar.
3. **Score** — every criterion. 🟡 = half credit. N-A must be justified; unjustified N-A = ❌.
4. **Gaps** — prioritized: MUST-HAVEs first. Each: criterion · exemplar · effort · impact.

## Dimensions (pick relevant)
Correctness · Security · Performance · UX/DX · Docs/onboarding · Testing/CI · Distribution/integrity · Observability · Governance/licensing · Maintainability · Compatibility · Error handling

## Discipline
- Don't inflate. 85% should say 85%.
- Every criterion cites a real exemplar — "npm does X", "Cargo does Y". No unsourced "best practice".
- State dimensions not assessed + why.

## Output
1. Bar — category + named exemplars
2. Scorecard — `| dimension | criterion | tier (must/excellence) | exemplar | status | evidence |`
3. Per-dimension % + overall % (list N-A exclusions)
4. Gaps — criterion · exemplar · effort · impact
5. Verdict — 1 line + top 3 moves

## Escalation — adaptive tiers

Auto-select tier from codebase size and task scope:

| Tier | Trigger | Claude Code | Other agents |
|---|---|---|---|
| **Light** | ≤5 files · AUDIT only · quick gap check | Single agent | Single session/chat |
| **Medium** | 6–20 files · AUDIT+FILL · module scope | Parallel Agents per dimension (Agent tool) | Multi-file mode / multiple composers |
| **Heavy** | >20 files · full AUDIT+FILL+ADOPT+CONFORM · "release"/"world-class" | Workflow (ultracode) — parallel per dimension + parallel CONFORM per file batch | Copilot Workspace · Cursor Background Agents · full Cascade · full orchestration |

Announce in user's language before starting:
- Thai: "งาน [N files] → [Light/Medium/Heavy] audit. (เปลี่ยน tier: light / medium / heavy)"
- English: "Scope [N files] → [Light/Medium/Heavy] audit. (override: light / medium / heavy)"
- Other: translate naturally.

User can always override the auto-selected tier.
