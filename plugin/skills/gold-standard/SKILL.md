---
name: gold-standard
description: >-
  World-class completeness audit — score a project's rules/standards/features against best-in-class exemplars, name the gaps, fill missing rules, adopt as binding, then offer to conform existing code. Triggers on keywords: "/gold-standard", "gold-standard", "audit rules", "are we world-class", "fill gaps", "complete our rules", "conform old code".
---

# Gold Standard

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Answer: **"For a project that does THIS — are rules/standards/features 100% vs world-class? If not, what's missing?"**

Four acts: **AUDIT** → **FILL** → **ADOPT** → **CONFORM**. Stop at any.

**Manual `/gold-standard` = interactive setup:** read `references/wizard.md` (dual-audience — layman 1-question default · programmer order→bill→pay). The auto/keyword path (the Triggers table) skips it.

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

1. **AUDIT** — pick 3–5 named exemplars **fresh at run time** (the bar moves with the era — never reuse a remembered bar), derive the 100% checklist per dimension, score (✅/🟡/❌/N-A), give overall %. Previously filled/adopted rules are audit subjects too: a rule past its `revalidate` due date or contradicted by today's exemplars is a gap.
2. **FILL** — write missing MUST-HAVE rules into the project's rules home (`.claude/rules/` → `AGENTS.md` → `STANDARDS.md`). Match project style + voice. Cite the exemplar. Invoke source-grounding for version-sensitive claims. Extend existing; never duplicate. Check the retired-rules record first — never resurrect a rule retired with a reason unless the user overrides. No overkill rules — only essential, practical, saturated ones. Stamp each rule: `<!-- coalmine: verified <YYYY-MM-DD> · exemplar <name> · revalidate <30|90>d -->` — 30d for fast-moving surfaces (agent platforms, model/API versions — ship weekly-to-daily), 90d for general engineering (stricter than every authoritative anchor: OWASP ~4y, NIST/FISMA annual → cheap early warning). CVE/advisory rules re-validate on the advisory EVENT first (Dependabot pattern); their 30d stamp is only the staleness backstop. Event override beats the calendar.
3. **ADOPT** — treat the completed ruleset as binding for the rest of the session. Code changes still need user approval — adoption governs *how* to work, not license to auto-edit.
4. **CONFORM** — scan existing code against adopted rules; report violations (`path:line` · rule · evidence). Fix on approval: checkpoint → one fix → build+tests → revert if newly red. Style Drift: conform minority patterns to the dominant style (highest average usage); never start a standalone style refactor.
5. **RE-VALIDATE** (runs inside every repeat AUDIT, or when offered on a past-due stamp) — verdict each CoalMine-stamped rule, all changes choice-gated:
   - **still valid** → re-stamp the date, touch nothing else (no churn);
   - **stale but needed** → rewrite against today's exemplar;
   - **obsolete** (subject removed, platform died, or substance merged into another rule) → **delete the rule** + record a one-line tombstone in the project's memory/decision log (`retired <rule> <date>: <reason>`) — dead rules burn context every session; the tombstone blocks the next FILL from resurrecting them.
   - **CONSISTENCY** (the agent trusts memory/rules it never verifies — so verify them): scan the memory/decision log and any in-repo rule register for (a) a prescribed fix/"decision" that **contradicts a binding rule or another decision** (e.g. prescribing randomness where a determinism rule forbids it) — a poisoned/stale entry; (b) references to a file, flag, or command that **no longer exists**. Flag each with the conflicting source quoted; correct only through the choice-gate. This is the semantic half; the mechanical half (`node scripts/consistency.mjs`: cross-document counts, byte-identical doctrine mirrors, well-formed stamps) runs without an agent.

Exemplar-picking rules, scorecard mechanics, stamp/tombstone formats: read `references/method.md` before the first AUDIT.

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

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. No lever for one? **Degrade gracefully — never fake parallelism you can't do**; escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Cost |
|---|---|---|---|
| **Light** | Quick gap check, AUDIT only | Cheapest model · single agent, no sub-agents. | Low |
| **Standard** | Balanced audit, AUDIT+FILL | Balanced model · raised reasoning · sub-agents per category **only if your platform runs concurrent workers** (else single-agent). | Balanced |
| **Heavy** | Full audit cycle, AUDIT+FILL+ADOPT+CONFORM | Most capable model + largest context · deepest reasoning · max sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

Per-platform Heavy levers + Heavy-run durability: read `references/escalation.md` before a Heavy run. No concurrent fan-out on your host → escalate by model + reasoning only.

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the pick marked `✓`, score shown, labels localized — and wait for the choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Copilot `askQuestions` · Gemini CLI `ask_user` (business-tier product; individual tiers ended 2026-06-18 → Antigravity CLI) · Codex `request_user_input` · Cursor/Devin Desktop (ex-Windsurf)/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** scope already audited ≥Standard this session → cap at Light (re-auditing fresh ground wastes tokens; scope to what changed). **Default tier:** honor `.coalmine.json` `defaultTier` unless the user requests a tier for that run — an explicit request overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. Interactive session (a user is present) → offer the fix menu after the report; non-interactive → report-only. Never fix without a chosen option.

**Entanglement:** after the report, if confirmed findings fall in another canary's domain, offer it once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.

**Self error-report:** if this skill misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a user-reviewed summary — never auto-submit, never include unapproved code or paths.
