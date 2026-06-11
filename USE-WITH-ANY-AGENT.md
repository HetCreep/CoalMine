# Use CoalMine with any AI coding agent

`SKILL.md` follows the cross-vendor **[Agent Skills spec](https://agentskills.io/specification)** (open standard by Anthropic; 40+ adopters as of 2026). CoalMine's 9 skills are conformed `SKILL.md` folders, so they drop in **natively** almost everywhere; only the install path differs. Paths below verified against vendor docs, Jun 2026.

## Native (drop the conformed `<name>/` folder in)

| Agent | Skills location (project) | Also reads |
|---|---|---|
| **Claude Code** | the plugin (`/plugin install coalmine@coalmine`), or `.claude/skills/` | `~/.claude/skills/` (global) |
| **Google Antigravity** | `.agent/skills/` per official docs (singular); `.agents/skills/` also seen working | `~/.gemini/antigravity/skills/` (global), `AGENTS.md` |
| **GitHub Copilot** | `.github/skills/` (CLI · VS Code agent mode · cloud) | `.claude/skills/`, `.agents/skills/`, `~/.copilot/skills/` |
| **OpenAI Codex** | `.agents/skills/` (CWD or repo root) — `agents/openai.yaml` is *optional* | `~/.agents/skills/` (global), `/etc/codex/skills` |
| **Gemini CLI** | `.gemini/skills/` or `.agents/skills/` | `~/.gemini/skills/`, `~/.agents/skills/` |
| **Cursor** | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/`, `.claude/skills/`, `.codex/skills/` |
| **Windsurf** | `.windsurf/skills/` or `.agents/skills/` | `~/.codeium/windsurf/skills/` (global) |
| **Junie** | `.junie/skills/` | `~/.junie/skills/`; offers import from `.cursor`/`.claude`/`.codex` skills |
| **Cline · Roo Code† · Amp · Goose** | `.agents/skills/` | per-agent dirs (`.cline/`, `.roo/`); Goose/Amp global: `~/.config/agents/skills/` |

† Roo Code upstream archived 2026-05; existing installs and forks still read skills.

Frontmatter quirks: Junie requires only `name`; Antigravity requires `description`. CoalMine ships both, so all variants are satisfied.

## Fallback — paste as rules

For any agent without skill discovery: copy a **conformed** skill body — from [`plugin/skills/<name>/SKILL.md`](plugin/skills/) or an installed target, **not** from `skills/` (those are templates with unresolved `<!-- SHARED:* -->` markers) — into its rules file / `AGENTS.md`, strip the YAML frontmatter.

## Portable vs not

| Part | Portable? |
|---|---|
| The 9 skills (the audits) | ✅ all 12 targets natively via the Agent Skills spec |
| Interactive choice menus (`ask_question`) | ✅ native question tools on 9 of 12 (see README table); text fallback on Goose/Amp/Junie |
| Sub-agent fan-out + tiers | ✅ on any host with a sub-agent system; inline otherwise |
| rotcanary **auto-cadence** (per-edit + session-end hooks) | ✅ auto on Claude Code (plugin) and GitHub Copilot (consumes the same `hooks/hooks.json` format) · 🔧 equivalent events on Cursor (`afterFileEdit`/`stop`), Gemini CLI (`AfterTool`/`AfterAgent`), Codex (`PostToolUse`/`Stop`), Goose (`AfterFileEdit`/`Stop`) — port [`hooks/`](hooks/) per platform docs · ⛔ no stop event on Cline/Junie — run manually (e.g. pre-commit) |

## Auto-cadence elsewhere

Only rotcanary has it. The Node hooks in [`hooks/`](hooks/) are plain stdin-JSON scripts — rewire per platform: per-edit event → record touched files; session-end event → nudge a QUICK scan. Where no session-end hook exists, fall back to manual runs or a git pre-commit hook.
