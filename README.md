# CoalMine

A suite of **5 quality meta-skills** for AI coding agents — the canaries you send into the coal mine *before* a problem becomes a disaster. Install once; each skill audits a different axis of code/project quality, reports with evidence, and doesn't change your code unless you ask.

## The five canaries

| Skill | Catches | Invoke |
|---|---|---|
| **rotcanary** | code-health — dead/unwired code · bug-risk · duplication · leaks · races · silent failures · input-boundary security · doc rot | `/coalmine:rotcanary` |
| **gold-standard** | completeness vs world-class — names cited exemplars, scores gaps; can **FILL** the missing rules + **ADOPT** them as a binding gate | `/coalmine:gold-standard` |
| **source-grounding** | hallucination — authoritative vs diverse sourcing, cite + confidence, never raw memory for volatile facts | `/coalmine:source-grounding` |
| **supply-chain-audit** | dependency & build trust — CVEs · maintenance · licenses · phone-home · CI integrity · artifact signing/SBOM | `/coalmine:supply-chain-audit` |
| **resilience-audit** | failure-mode (FMEA) — what breaks when X fails: partial/rollback/idempotency/retry; no silent-success | `/coalmine:resilience-audit` |

Shared DNA: **sub-agent fan-out (model-aware)** · **cite evidence** · **no inflation** · **proportionality (don't overkill)** · **report, don't fix unless asked**.

## Install

```
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```

All five become `/coalmine:<name>`. **rotcanary** also installs an auto-cadence (hooks) — see below. No `settings.json` editing.

> **Node.js on `PATH`** is needed only for rotcanary's auto-cadence hooks (ships with the npm install of Claude Code). The skills themselves are plain prompt text and need nothing. No Node → see [`alt/powershell/`](alt/powershell/) or run skills manually.

## rotcanary auto-cadence (the only auto skill)

rotcanary bundles two cross-platform Node hooks (active on install):
- **Per edit** (`PostToolUse`) — records touched code files + flags conflict-markers / >800-line files. Cheap, non-blocking.
- **Per session-end** (`Stop`) — auto-runs `/coalmine:rotcanary` QUICK on the session's touched files. Loop-guarded, one-shot.

**Modes** via `~/.claude/.rotcanary-mode`: `auto` (default) · `manual` (tripwire only — you run it) · `off`. Back-compat: `~/.claude/.rotcanary-off` forces off. The other four skills are **on-demand**.

## Smart execution

Every skill scales. On a host with sub-agents, a DEEP run **fans out** — one worker per category/dimension, each on the cheapest model tier that fits (mechanical → fast; security/correctness/verify → strong) + an adversarial verify pass. Small or low-stakes input → **inline + QUICK** (proportionality: never overkill). Single-model / no sub-agents → inline.

## Use with other agents

The skills are portable prompt text → usable on Cursor · Copilot · Codex · Gemini · etc. (the auto-cadence is Claude-Code-only). See [`USE-WITH-ANY-AGENT.md`](USE-WITH-ANY-AGENT.md).

## Why "CoalMine"

A canary in the coal mine = early warning before catastrophe. Each skill is a canary for one class of danger; **rotcanary** is the literal one (plus its live edit-time tripwire). Catch the bad air early.

## License

MIT — see [LICENSE](LICENSE).
