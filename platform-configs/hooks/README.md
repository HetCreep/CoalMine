# rotcanary auto-cadence — hook wiring per platform

Only Claude Code (plugin route) wires automatically. Every snippet below is **manual**: copy it into place, adjust the CoalMine path, and test in your setup — the cadence is post-edit → record touched file · session-stop → nudge a QUICK scan. Event names verified against vendor docs (Jun 2026); stdin payload field names may still differ per platform.

| File | Platform | Events used | Docs |
|---|---|---|---|
| `copilot-hooks.json` | GitHub Copilot (VS Code agent mode / CLI) | `PostToolUse` / `Stop` (same stdin-JSON protocol as Claude Code) | code.visualstudio.com/docs/agent-customization/hooks |
| `cursor-hooks.json` | Cursor (`~/.cursor/hooks.json` or `<proj>/.cursor/hooks.json`) | `afterFileEdit` / `stop` — stop cannot block, so the snippet wraps the nudge into Cursor's `followup_message` output | cursor.com/docs/agent/hooks |
| `gemini-settings-hooks.json` | Gemini CLI (merge into `.gemini/settings.json`) | `AfterTool` / `AfterAgent` | geminicli.com/docs/hooks/reference/ |
| `codex-hooks.json` | Codex CLI (`hooks.json` beside config) | `PostToolUse` / `Stop` | developers.openai.com/codex/hooks |
| `antigravity-hooks.json` | Google Antigravity (workspace or global hooks JSON) | `PostToolUse` / stop-condition hooks | antigravity.google/docs/hooks |

Claude Code without the plugin: use [`../../hooks/settings.snippet.json`](../../hooks/settings.snippet.json) (Node) or [`../../alt/powershell/settings.snippet.json`](../../alt/powershell/settings.snippet.json) (no-Node fallback) instead — same cadence, wired via `~/.claude/settings.json`.

Notes:
- All snippets call the scripts in `<repo>/hooks/` — adjust the absolute path to where you cloned CoalMine.
- Cline has no stop event and Junie has no hooks — run `/rotcanary` manually there (e.g. before committing).
