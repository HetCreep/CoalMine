<div align="center">

# 🐤 CoalMine

**5 quality canaries for your AI coding agent** — catch dead code, weak standards, hallucinations, supply-chain rot, and fragile failure paths before they bite.

![license](https://img.shields.io/badge/license-MIT-blue)
![plugin](https://img.shields.io/badge/Claude_Code-plugin-orange)
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

*Every skill: model-aware sub-agent fan-out · cites evidence · no inflation · reports, never edits unless asked.*

## Install

```
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```

Then: `/coalmine:rotcanary` · `/coalmine:gold-standard` · `/coalmine:source-grounding` · `/coalmine:supply-chain-audit` · `/coalmine:resilience-audit`

## Auto mode (rotcanary only)

`rotcanary` runs itself — records your edits, audits the touched files at session end. Cross-platform Node hooks, no `settings.json` editing. Modes via `~/.claude/.rotcanary-mode`: `auto` (default) · `manual` · `off`.

> Hooks need Node on `PATH` (ships with Claude Code's npm install; no Node → [`alt/powershell/`](alt/powershell/)). The other 4 skills are on-demand, zero deps.

## Other agents

Skills are portable prompt text — usable on Cursor, Copilot, Codex, Gemini (auto mode is Claude-Code-only). See [USE-WITH-ANY-AGENT.md](USE-WITH-ANY-AGENT.md).

---

<div align="center">

*Canary in the coal mine — early warning before catastrophe.*<br>
MIT · [HetCreep](https://github.com/HetCreep)

</div>
