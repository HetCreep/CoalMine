# Use CoalMine with any AI coding agent

`SKILL.md` is an **open standard** — as of 2026 it's read by **12+ leading agents**. CoalMine's 9 skills are conformed `SKILL.md` folders, so they drop in **near-natively** almost everywhere; only the install path differs.

## Near-native (drop the `skills/<name>/` folder in)

| Agent | Skills location |
|---|---|
| **Claude Code** | the plugin (`/plugin install coalmine@coalmine` → `/coalmine:<name>`), or `~/.claude/skills/` |
| **Google Antigravity** | `.agents/skills/<name>/` (also reads `AGENTS.md`) |
| **GitHub Copilot** | `.github/skills/<name>/` (Copilot CLI · VS Code agent mode) |
| **OpenAI Codex** | Codex skills dir (+ an `openai.yaml` metadata file alongside) |
| **Gemini CLI** | `.gemini/skills/` |
| **Cursor** | `.cursor/skills/` (manually placed or via `install.mjs`) |
| **Windsurf** | `.windsurf/skills/` |
| **Cline · Roo Code · Amp · Goose · Junie · Letta** | `.agents/skills/` |

Each tool may add extras (Claude Code/Antigravity: context forking + the auto-cadence hooks), but the core `SKILL.md` body works across all. Frontmatter fields can differ slightly per tool — tweak `name`/`description` if a tool complains; the body is the substance.

## Fallback — paste as rules

For any agent that reads an instructions file but lacks skill discovery: copy a skill's body into its rules / `AGENTS.md`, strip the YAML frontmatter, replace `/coalmine:<name>` with "run the &lt;name&gt; audit". Many tools (incl. Antigravity, Codex) read **`AGENTS.md`** — drop it there once and they all pick it up.

## Portable vs not

| Part | Portable? |
|---|---|
| The 9 skills (the audits) | ✅ 12+ agents via `SKILL.md` |
| Sub-agent fan-out + model-aware tiers | ✅ on any host with a sub-agent system; inline otherwise |
| rotcanary **auto-cadence** (per-edit + session-end hooks) | ⛔ Claude-Code-native; elsewhere run on demand, or port the Node hooks in [`hooks/`](hooks/) to the host's hook system |

## Auto-cadence elsewhere

Only rotcanary has it. Mirror the cross-platform Node hooks in [`hooks/`](hooks/) to your agent's hook/command-on-event system (per-edit → record touched files; session-end → run rotcanary), or run manually (e.g. pre-commit).
