<!-- coalmine: verified 2026-06-12 · revalidate 30d · definition file for rot-canary -->
# Rot-Canary — auto-cadence per platform

Stop hook → auto QUICK scan on the session's touched files (report only). Platform support (verified Jun 2026; Antigravity re-verified 2026-07-12):

- **Auto-wired:** Claude Code only — the CoalMine plugin ships PostToolUse + Stop hooks (`hooks/hooks.json`).
- **Wire manually** (ready-made snippets in `platform-configs/hooks/` — copy, adjust path, test): GitHub Copilot `PostToolUse`/`Stop` (same hooks format) · Cursor `afterFileEdit`/`stop` (wrapped to `followup_message`) · Gemini CLI `AfterTool`/`AfterAgent` (superseded by Antigravity CLI, Jun 2026) · Codex `PostToolUse`/`Stop` · Antigravity 2.0 `hooks.json` engine — `PreInvocation` (conductor; AG never fires SessionStart, so a once-per-session tmp-marker guard rides the first model call) / `PostToolUse` / `Stop`, with a trailing event-name argument that switches the CoalMine hooks to AG mode (`additionalContext` emit; Claude Code invokes with no argument — unchanged there). Goose has `AfterFileEdit`/`Stop` events — no snippet yet, port `hooks/` per its docs.
- **Manual only** (no stop event): Cline, Junie — run `/rot-canary` yourself, e.g. before commit.

Kill-switch: any install that runs these hook scripts honors `~/.claude/.rot-canary-off` (and `~/.claude/.rot-canary-mode` = auto|manual|off).
