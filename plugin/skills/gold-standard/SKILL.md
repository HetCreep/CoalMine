---
name: gold-standard
description: >-
  World-class completeness audit — score a project's rules/standards/features against best-in-class exemplars, name the gaps, fill missing rules, adopt as binding, then offer to conform existing code. Triggers on keywords: "/gold-standard", "gold-standard", "audit rules", "are we world-class", "fill gaps", "complete our rules", "conform old code".
---

# Gold Standard

**Language:** Generate EVERYTHING at runtime in the user's language — questions, answer options, menu labels, recommendations, report narrative. Detect from their messages; never default to English just because this file is English. English is allowed only for technical terms: commands, paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

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

1. **AUDIT** — pick 3–5 named exemplars **fresh at run time** (the bar moves with the era — never reuse a remembered bar), derive the 100% checklist per dimension, score (✅/🟡/❌/N-A), give overall %. Previously filled/adopted rules are audit subjects too: a rule past its `revalidate` due date or contradicted by today's exemplars is a gap.
2. **FILL** — write missing MUST-HAVE rules into project's rules home (`.claude/rules/` → `AGENTS.md` → `STANDARDS.md`). Match project style + voice. Cite the exemplar. Invoke source-grounding for version-sensitive claims. Extend existing; never duplicate. Check the project's retired-rules record first — never resurrect a rule retired with a reason, unless the user explicitly overrides. Never generate overkill rules — only essential, practical, highly saturated ones. Stamp every rule you write: `<!-- coalmine: verified <YYYY-MM-DD> · exemplar <name> · revalidate <30|90>d -->` — 30d for fast-moving surfaces (agent platforms, model/API versions; grounded Jun 2026: these ship weekly-to-daily), 90d for general engineering rules (stricter than every authoritative anchor — OWASP editions ~4y, NIST/FISMA annual — so it serves as cheap early warning). CVE/advisory-based rules re-validate on the advisory EVENT first (Dependabot pattern); their 30d stamp is only the staleness backstop. Event override always beats the calendar.
3. **ADOPT** — treat completed ruleset as binding for rest of session. Code changes still need user approval — adoption governs *how* to work, not license to auto-edit.
4. **CONFORM** — scan existing code against adopted rules; report violations (`path:line` · rule · evidence). Fix on approval: checkpoint → one fix → build+tests → revert if newly red. Style Drift: conform minority patterns to the dominant style (highest average usage); never start a standalone style refactor.
5. **RE-VALIDATE** (runs inside every repeat AUDIT, or when offered on a past-due stamp) — verdict each CoalMine-stamped rule, all changes choice-gated:
   - **still valid** → re-stamp the date, touch nothing else (no churn);
   - **stale but needed** → rewrite against today's exemplar;
   - **obsolete** (its subject was removed, its platform died, or its substance moved into another rule) → **delete the rule** and record a one-line tombstone in the project's memory/decision log (`retired <rule> <date>: <reason>`) — dead rules burn context every session, and the tombstone prevents the next FILL from resurrecting them.
   - **CONSISTENCY** (the agent trusts memory/rules it never verifies — so verify them): scan the project's memory/decision log and any in-repo rule register for (a) a prescribed fix or "decision" that **contradicts a binding rule or another recorded decision** (e.g. prescribing a randomized approach where a determinism rule forbids it) — a poisoned or stale entry; (b) references to a file, flag, or command that **no longer exists**. Flag each as a finding with the conflicting source quoted; correct only through the choice-gate. This is the semantic half; the mechanical half (`node scripts/consistency.mjs`: cross-document counts, byte-identical doctrine mirrors, well-formed stamps) runs without an agent.

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

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. If your platform lacks a lever, **degrade gracefully: never fake parallelism you cannot do** — escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Token Cost |
|---|---|---|---|
| **Light** | Quick gap check, AUDIT only | Cheapest/fastest mode · most economical model · single agent, no sub-agents. | Low |
| **Standard** | Balanced audit, AUDIT+FILL | Balanced model · default/raised reasoning · focused sub-agents per category **only if your platform runs concurrent workers** (else stay single-agent). | Balanced |
| **Heavy** | Full audit cycle, AUDIT+FILL+ADOPT+CONFORM | Most capable model + largest context · deepest reasoning (max/xhigh) · maximum sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

**Per-platform Heavy lever** (use your host's, if it has concurrent fan-out): Claude Code → Dynamic Workflows / `ultracode` (≤16 concurrent agents); OpenAI Codex → `xhigh` + subagents + Cloud `--attempts`; Cursor → Max Mode + parallel Cloud Agents; Antigravity → Agent Manager; Amp → Oracle + subagents; GitHub Copilot → `/fleet` (Copilot CLI) + Cloud agent; Goose → subagents; JetBrains → Junie CLI; Gemini CLI / Cline (read-only) / Windsurf (now Devin) → subagents. **If your platform has no concurrent fan-out, escalate by model + reasoning only.** ⚠️ Subagent support CHURNS fast — most major agents added it through 2026 — so verify your platform's current capability rather than trusting any fixed list here.

**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories/dimensions/aspects relevant ③ release/security/pre-ship context ④ findings will drive code changes. **0–1 Light · 2–3 Standard · 4 Heavy.** **Freshness cap:** if the scope was already audited ≥Standard this session, cap the recommendation at Light regardless of the base score — re-auditing fresh ground wastes tokens; scope the run to what changed since. **Default tier:** honor `.coalmine.json` `defaultTier` (Light/Standard/Heavy) as the default on every route unless the user requests a tier for that run. An explicit user tier request always overrides everything.

**Hook Context (auto-triggered):** auto-Light, no tier question, no sub-agents — report first. If the session is interactive (a user is present), offer the fix menu after the report; truly non-interactive runs stay report-only. Never fix without a chosen option.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).

**Self error-report:** if this skill itself misbehaves (contradictory instruction, broken procedure, wrong finding class), OFFER to file it at https://github.com/HetCreep/CoalMine/issues/new/choose with a summary the user has reviewed — never auto-submit, never include unapproved code or paths.

**Entanglement:** after delivering the report, if confirmed findings fall in another canary's domain, offer that canary once via `ask_question` (one line, max one offer): perf/N+1 → scale-canary · contract/serialization/config → drift-canary · failure-path/retry → resilience-audit · logging/metrics → telemetry-canary · coupling/DI → testability-canary · dependency/CVE → supply-chain-audit · unverified version-sensitive claim → source-grounding · missing/stale rule → gold-standard.
