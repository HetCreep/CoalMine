**Agent Context (interactive):** score the tier rubric, then call `ask_question` once with the 3 tiers — the rubric's pick marked `✓`, score shown, labels localized — and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none → numbered text menu.

**Tier rubric (deterministic):** +1 each — ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release/security/pre-ship context ④ findings will drive code changes ⑤ scope not already audited ≥Standard this session. **0–1 Light · 2–3 Standard · 4–5 Heavy.** An explicit user tier request always overrides.

**Hook Context (non-interactive):** auto-Light, report-only — no questions, no fixes, no sub-agents.

**Heavy durability:** run in short phases, reading results between them; if a run dies, recover finished sub-agent results from your platform's run records and re-spawn only what is missing. On Claude Code, fan out with the bundled `coalmine-scanner` agent (read-only, one dimension per spawn, table output).
