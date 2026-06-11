# rotcanary auto-cadence — hook wiring per platform

Claude Code (plugin route) and GitHub Copilot wire automatically. The snippets below wire the same two-step cadence elsewhere: **post-edit → record touched file** · **session-stop → nudge a QUICK scan**. Event names verified against vendor docs (Jun 2026); snippets are starting points — test in your setup before relying on them.

| File | Platform | Events used | Docs |
|---|---|---|---|
| `copilot-hooks.json` | GitHub Copilot (VS Code agent mode / CLI) | `PostToolUse` / `Stop` | code.visualstudio.com/docs/agent-customization/hooks |
| `cursor-hooks.json` | Cursor (`~/.cursor/hooks.json` or `<proj>/.cursor/hooks.json`) | `afterFileEdit` / `stop` (`followup_message`) | cursor.com/docs/agent/hooks |
| `gemini-settings-hooks.json` | Gemini CLI (merge into `.gemini/settings.json`) | `AfterTool` / `AfterAgent` | geminicli.com/docs/hooks/reference/ |
| `codex-hooks.json` | Codex CLI (`hooks.json` beside config) | `PostToolUse` / `Stop` | developers.openai.com/codex/hooks |

Notes:
- All snippets call `node <repo>/hooks/rotcanary-touch.js` and `rotcanary-stop.js` — adjust the absolute path to where you cloned CoalMine.
- Cursor's `stop` hook cannot block; the snippet uses `followup_message` to submit the scan request as the next turn.
- Cline has no stop event and Junie has no hooks — use a git pre-commit hook (`hooks/pre-commit.sh`) or run `/rotcanary` manually there.
