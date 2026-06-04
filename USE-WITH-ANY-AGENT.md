# Use CoalMine with any AI coding agent

CoalMine ships as a Claude Code plugin, but each skill is **just a prompt** — `skills/<name>/SKILL.md` is portable. Run any of the five on any agent.

## Portable vs Claude-Code-only

| Part | Portable to other agents? |
|---|---|
| The 5 skills (rotcanary · gold-standard · source-grounding · supply-chain-audit · resilience-audit) — categories, verify rules, output | ✅ prompt text |
| Sub-agent fan-out + model-aware distribution | ✅ on any host that HAS a sub-agent system; inline otherwise |
| rotcanary **auto-cadence** (per-edit tripwire + session-end auto-run) | ⛔ Claude Code only (needs `PostToolUse`/`Stop` hooks) |

On other agents you run each skill **on demand**.

## Install a skill's Brief per agent

Copy the body of the relevant `skills/<name>/SKILL.md` into the agent's rules/instructions file. Strip the YAML frontmatter (Claude-Code-specific); replace `/coalmine:<name>` with "run the &lt;name&gt; audit".

| Agent | Where | Trigger |
|---|---|---|
| **Cursor** | `.cursor/rules/<name>.mdc` (Agent-requestable rule) | "run <name>" / @<name> |
| **GitHub Copilot** | `.github/copilot-instructions.md` or `.github/prompts/<name>.prompt.md` | invoke the prompt |
| **Codex / AGENTS.md hosts** | a section in `AGENTS.md` or `docs/<name>.md` referenced from it | "run the <name> audit" |
| **Gemini CLI** | `GEMINI.md` or a custom command/extension | "run the <name> audit" |
| **Windsurf / Cline / Aider / others** | their rules/instructions file | "run the <name> audit" |

## Auto-cadence on a non-Claude-Code agent?

Only **rotcanary** has it. If your agent has a hook / command-on-event system, mirror the cross-platform Node hooks in [`hooks/`](hooks/) to its event model (per-edit → record touched files; session-end → run rotcanary on them). No hook system → run manually (e.g. pre-commit). A contributed adapter for another agent's hook system is welcome.
