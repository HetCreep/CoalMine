---
name: gold-standard
description: >-
  World-class completeness audit — score a project's rules/standards/features against best-in-class exemplars, name the gaps, fill missing rules, adopt as binding, then offer to conform existing code. Triggers on keywords: "/gold-standard", "gold-standard", "audit rules", "are we world-class", "fill gaps", "complete our rules", "conform old code".
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

ADOPT and every CONFORM fix are gated through `ask_question` — never assume approval.

1. **AUDIT** — pick 3–5 named exemplars, derive the 100% checklist per dimension, score (✅/🟡/❌/N-A), give overall %.
2. **FILL** — write missing MUST-HAVE rules into project's rules home (`.claude/rules/` → `AGENTS.md` → `STANDARDS.md`). Match project style + voice. Cite the exemplar. Invoke source-grounding for version-sensitive claims. Extend existing; never duplicate. Never generate overkill or unnecessary rules — only write rules that are essential, practical, and highly saturated (หลีกเลี่ยงการสร้างกฎแบบ Overkill ที่ฟุ่มเฟือยเกินจำเป็น).
3. **ADOPT** — treat completed ruleset as binding for rest of session. Code changes still need user approval — adoption governs *how* to work, not license to auto-edit.
4. **CONFORM** — scan existing code against adopted rules; report violations (`path:line` · rule · evidence). Fix on approval: checkpoint → one fix → build+tests → revert if newly red. When resolving style or pattern inconsistencies (Style Drift), if multiple styles are mixed, always conform the minority patterns to match the most dominant/frequent style (highest average usage) in the project to minimize churn.

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
- **Blocked lookups:** if sandbox/network blocks an external check, mark it **N-A** with justification — never guess.
- **Multi-source grounding:** never score from memory or a single source — cross-reference exemplars, registries, advisory feeds (GHSA/OSV/NVD).

## Output
1. Bar — category + named exemplars
2. Scorecard — `| dimension | criterion | tier (must/excellence) | exemplar | status | evidence |`
3. Per-dimension % + overall % (list N-A exclusions)
4. Gaps — criterion · exemplar · effort · impact
5. Verdict — 1 line + top 3 moves

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Quick gap check, AUDIT only | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Balanced audit, AUDIT+FILL | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full audit cycle, AUDIT+FILL+ADOPT+CONFORM | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces.
