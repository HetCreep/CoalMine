<div align="center">

# 🐤 CoalMine

**5 quality canaries for your AI coding agent** — catch dead code, weak standards, hallucinations, supply-chain rot, and fragile failure paths before they bite.

![license](https://img.shields.io/badge/license-MIT-blue)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_16%2B_agents-success)
![skills](https://img.shields.io/badge/skills-5-success)

</div>

---

## The canaries

| Skill | Catches |
|---|---|
| `rotcanary` | dead/unwired code · bugs · leaks · races · silent failures · doc rot |
| `gold-standard` | gaps vs world-class — scores, then fills & adopts the missing rules |
| `source-grounding` | hallucination — authoritative vs diverse sources, cite + confidence |
| `supply-chain-audit` | CVEs · licenses · phone-home · CI integrity · artifact signing |
| `resilience-audit` | failure modes — partial / rollback / idempotency, no silent-success |

*Every skill: cites evidence · no inflation · report-first. Fix mode is opt-in, choice-gated: checkpoint → apply safe fix → build+test → auto-revert if newly red. Risky fixes need an explicit pick.*

## Adaptive tiers

Scan skills (rotcanary · gold-standard · supply-chain-audit · resilience-audit) auto-detect scope and select the right execution tier — no configuration needed:

| Tier | Trigger | Mechanism |
|---|---|---|
| **Light** | small scope · few files · QUICK | Single agent — fast, low cost |
| **Medium** | module scope · 6–20 files · DEEP | Parallel agents per category |
| **Heavy** | whole-repo · >20 files · release/critical | Full multi-agent orchestration + adversarial verify |

The skill announces the detected tier before starting and accepts override: `light` / `medium` / `heavy`.

## Language-aware menus

All choice menus, escalation prompts, and status messages mirror the user's writing language — Thai → Thai, English → English, Japanese → Japanese, etc. No setup required.

## Always-on vs on-demand

| Mode | Skills | How |
|---|---|---|
| **Always-on** | `rotcanary` (Stop hook) · `source-grounding` (standing rule) | Fire automatically — no command needed |
| **Keyword trigger** | `gold-standard` | "audit rules" / "fill gaps" / "are we world-class" / "conform old code" |
| **On-demand** | `supply-chain-audit` · `resilience-audit` | Invoke manually when relevant |

Recommended setup — add to `CLAUDE.md` / `AGENTS.md`:
```
# rotcanary: Stop hook auto-scans touched files. "fix it" → choice-gated fix menu.
# source-grounding: verify version-sensitive facts (API/SDK · versions · CVEs · auth) vs authoritative source, or flag ⚠️ unverified.
# gold-standard: fires on keywords above — fills missing rules, adopts as binding, offers conform.
```

## Install

```
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```

Then: `/coalmine:rotcanary` · `/coalmine:gold-standard` · `/coalmine:source-grounding` · `/coalmine:supply-chain-audit` · `/coalmine:resilience-audit`

## Auto mode (rotcanary)

`rotcanary` runs itself — records edits via PostToolUse hook, audits touched files at session end (Stop hook). No `settings.json` editing required.

> Hooks need Node on `PATH` (ships with Claude Code's npm install; no Node → [`alt/powershell/`](alt/powershell/)). The other 4 skills are on-demand, zero deps.

## Other agents

`SKILL.md` is an **open standard read by 16+ agents** (2026) — drop the skill folder into each tool's skills dir:
Claude Code · Antigravity (`.agents/skills/`) · GitHub Copilot (`.github/skills/`) · OpenAI Codex · Gemini CLI · Cursor · Cline · Windsurf · OpenCode · Amp · Goose · Junie · Letta · …

Auto-cadence (rotcanary's hooks) is Claude-Code-only; elsewhere run on demand. Full guide: [USE-WITH-ANY-AGENT.md](USE-WITH-ANY-AGENT.md).

**Bulk install / verify** (cross-platform, needs Node):
```
node scripts/install.mjs <claude|antigravity|copilot|codex|PATH>   # copy all 5 skills into a target
node scripts/verify.mjs  [target]                                  # check repo + (optional) target
```

---

<div align="center">

*Canary in the coal mine — early warning before catastrophe.*<br>
MIT · [HetCreep](https://github.com/HetCreep)

</div>
