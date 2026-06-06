<div align="center">

# 🐤 CoalMine

**5 quality canaries for your AI coding agent** — catch dead code, weak standards, hallucinations, supply-chain rot, and fragile failure paths before they bite.

![license](https://img.shields.io/badge/license-MIT-blue)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_16%2B_agents-success)
![skills](https://img.shields.io/badge/skills-5-success)
![agents](https://img.shields.io/badge/works_with-Claude_·_Copilot_·_Cursor_·_Windsurf_·_Cline_·_Gemini_·_Codex_·_more-informational)

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

Scan skills auto-detect scope and select the right execution tier — no configuration needed:

| Tier | Trigger | Mechanism |
|---|---|---|
| **Light** | small scope · few files · QUICK | Single agent — fast, low cost |
| **Medium** | module scope · 6–20 files · DEEP | Parallel agents per category |
| **Heavy** | whole-repo · >20 files · release/critical | Full multi-agent orchestration + adversarial verify |

The skill announces the detected tier before starting and accepts override: `light` / `medium` / `heavy`.

## Language-aware menus

All choice menus, escalation prompts, and status messages mirror the user's writing language — Thai → Thai, English → English, Japanese → Japanese, etc. No setup required.

---

## Works with any agent

`SKILL.md` is an **open standard** — drop the skill folder into your agent's skills directory:

| Agent | Skills directory | Install shortcut |
|---|---|---|
| **Claude Code** | `~/.claude/skills/` | `/plugin install coalmine@coalmine` |
| **GitHub Copilot** | `.github/skills/` | `node scripts/install.mjs copilot` |
| **Cursor** | `.cursor/skills/` | `node scripts/install.mjs PATH` |
| **Windsurf** | `.windsurf/skills/` | `node scripts/install.mjs PATH` |
| **Cline · Amp · Goose · Junie** | `.agents/skills/` | `node scripts/install.mjs PATH` |
| **OpenAI Codex** | `.codex/skills/` | `node scripts/install.mjs codex` |
| **Gemini CLI** | `.gemini/skills/` | `node scripts/install.mjs PATH` |
| **Any SKILL.md-compatible agent** | agent's skills dir | copy skill folder manually |

**Bulk install / verify** (cross-platform, needs Node):
```
node scripts/install.mjs <claude|copilot|codex|PATH>   # copy all 5 skills into a target
node scripts/verify.mjs  [target]                       # check repo + (optional) target
```

Full guide for non-Claude agents: [USE-WITH-ANY-AGENT.md](USE-WITH-ANY-AGENT.md)

> Auto-cadence (rotcanary runs at session end via Stop hook) is **Claude Code only**. All other agents: run skills on demand.

---

## Always-on vs on-demand

| Mode | Skills | How |
|---|---|---|
| **Always-on** | `rotcanary` (Stop hook) · `source-grounding` (standing rule) | Fire automatically — no command needed |
| **Keyword trigger** | `gold-standard` | "audit rules" / "fill gaps" / "are we world-class" / "conform old code" |
| **On-demand** | `supply-chain-audit` · `resilience-audit` | Invoke manually when relevant |

## Claude Code — quick setup

```
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```

Then add to `CLAUDE.md` / `AGENTS.md`:
```
# rotcanary: Stop hook auto-scans touched files at session end. "fix it" → choice-gated fix menu.
# source-grounding: verify version-sensitive facts (API/SDK · versions · CVEs · auth) vs authoritative source, or flag ⚠️ unverified.
# gold-standard: fires on keywords above — fills missing rules, adopts as binding, offers conform.
```

`rotcanary` records edits via PostToolUse hook and audits at session end (Stop hook) — no `settings.json` editing required.

> Hooks need Node on `PATH` (ships with Claude Code's npm install; no Node → [`alt/powershell/`](alt/powershell/)).

---

<div align="center">

*Canary in the coal mine — early warning before catastrophe.*<br>
MIT · [HetCreep](https://github.com/HetCreep)

</div>
