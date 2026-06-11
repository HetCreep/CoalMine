**Agent Context (Interactive):** Call `ask_question` after scope assessment. Do not start work until user confirms.

**Hook Context (Non-Interactive / Stop-Hook):** Auto-select Light. Skip `ask_question`. Run report-only, no fixes. No sub-agents.

**`ask_question` = your platform's interactive question tool**, whatever its real name: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo Code `ask_followup_question` · GitHub Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in question prompts. If your platform has no such tool (e.g. Goose), present the same options as a numbered text list and wait for the user's reply.

**Heavy Durability (long multi-agent runs):**
- Chunk the run into short orchestration phases (each completing within minutes) and read results between phases — one long-running orchestration is one session interruption away from losing all in-flight work.
- If an orchestration dies mid-run (session restart/kill), recover before re-running: completed sub-agent results usually survive in your platform's run records (run journal, resumable run ID, or per-agent transcripts) — re-spawn only the missing pieces.
