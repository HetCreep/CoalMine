# Rotcanary — auto-cadence per platform

Stop hook → auto QUICK scan on the session's touched files (report only). Platform support (verified Jun 2026):

- **Auto-wired:** Claude Code — the CoalMine plugin ships PostToolUse + Stop hooks (`hooks/hooks.json`); GitHub Copilot (VS Code agent mode / CLI) consumes the same hooks format. Kill-switch `~/.claude/.rotcanary-off` applies to these hook installs only.
- **Wire manually** (equivalent events exist — port the `hooks/` scripts per platform docs): Cursor `afterFileEdit`/`stop` · Gemini CLI `AfterTool`/`AfterAgent` · Codex `PostToolUse`/`Stop` · Goose `AfterFileEdit`/`Stop`.
- **Manual only** (no stop event): Cline, Junie — run `/rotcanary` yourself, e.g. before commit or via a git pre-commit hook.
