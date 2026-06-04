# Use CoalMine with any AI coding agent

Each skill is a standard `SKILL.md` — so CoalMine travels. Two tiers of support:

## Tier 1 — near-native (same `SKILL.md` format, ~zero changes)

| Agent | How |
|---|---|
| **Claude Code** | the plugin: `/plugin install coalmine@coalmine` → `/coalmine:<name>` (+ rotcanary auto-cadence) |
| **Google Antigravity** | copy each `skills/<name>/` folder → your project's `.agents/skills/<name>/` (Antigravity uses the same skill-folder + `SKILL.md` format). It also reads `AGENTS.md`. |

## Tier 2 — paste as rules (any agent that reads an instructions file)

Copy the body of `skills/<name>/SKILL.md` into the agent's rules file; strip the YAML frontmatter; replace `/coalmine:<name>` with "run the &lt;name&gt; audit".

| Agent | Where |
|---|---|
| **Cursor** | `.cursor/rules/<name>.mdc` |
| **GitHub Copilot** | `.github/copilot-instructions.md` or `.github/prompts/<name>.prompt.md` |
| **Codex / other AGENTS.md hosts** | a section per skill in `AGENTS.md` |
| **Gemini CLI** | `GEMINI.md` or a custom command |
| **Windsurf · Cline · Aider · others** | their rules/instructions file |

> Many tools read **`AGENTS.md`** (incl. Antigravity) — drop a skill there once and every AGENTS.md-aware agent picks it up.

## Portable vs not

| Part | Portable? |
|---|---|
| The 5 skills (the audits) | ✅ everywhere — as `SKILL.md` or pasted rules |
| Sub-agent fan-out + model-aware tiers | ✅ on any host with a sub-agent system; inline otherwise |
| rotcanary **auto-cadence** (per-edit + session-end hooks) | ⛔ Claude-Code-native; elsewhere run on demand, or port the Node hooks in [`hooks/`](hooks/) to the host's hook system |

## Auto-cadence elsewhere

Only rotcanary has it. If your agent has a hook / command-on-event system, mirror the cross-platform Node hooks in [`hooks/`](hooks/) (per-edit → record touched files; session-end → run rotcanary). No hook system → run manually (e.g. pre-commit). Adapters welcome.
