# Use rotcanary with any AI coding agent

rotcanary ships as a Claude Code plugin (skill + auto-cadence hooks), but the **audit itself is just a prompt** — [`skills/scan/SKILL.md`](skills/scan/SKILL.md) is portable. You can run it on any agent.

## Portable part vs Claude-Code-only part

| Part | Portable to other agents? |
|---|---|
| The audit Brief — categories, verify rules, severity, output, per-stack tooling | ✅ it's prompt text |
| **Sub-agent fan-out + model-aware distribution** (SKILL §5) | ✅ on any host that HAS a sub-agent system; runs inline otherwise |
| **Auto-cadence** — per-edit tripwire + per-session-end auto-run | ⛔ Claude Code only (needs its `PostToolUse`/`Stop` hooks) |

On other agents you get the full audit **on demand** — you trigger it yourself instead of it firing automatically.

## Install the Brief per agent

Copy the body of `skills/scan/SKILL.md` into the agent's rules/instructions file. Strip the YAML frontmatter (Claude-Code-specific) and replace any `/rotcanary:scan` with "run the rotcanary audit".

| Agent | Where | Trigger |
|---|---|---|
| **Cursor** | `.cursor/rules/rotcanary.mdc` (Agent-requestable rule) | "run rotcanary" / @rotcanary |
| **GitHub Copilot** | `.github/copilot-instructions.md` or `.github/prompts/rotcanary.prompt.md` | invoke the prompt |
| **Codex / AGENTS.md hosts** | a section in `AGENTS.md` or `docs/rotcanary.md` referenced from it | "run the rotcanary audit" |
| **Gemini CLI** | `GEMINI.md` or a custom command/extension | "run the rotcanary audit" |
| **Windsurf / Cline / Aider / others** | their rules/instructions file | "run the rotcanary audit" |

## Want auto-cadence on a non-Claude-Code agent?

If your agent has a hook / command-on-event system, mirror the two cross-platform Node hooks in [`hooks/`](hooks/) to its event model (per-edit → record touched files; session-end → run the audit on them). No hook system → run the Brief manually (e.g. before each commit). A contributed adapter for another agent's hook system is welcome — see the repo README.
