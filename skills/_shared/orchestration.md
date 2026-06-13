## Escalation — Scope & Model Quality

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. If your platform lacks a lever, **degrade gracefully: never fake parallelism you cannot do** — escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Token Cost |
|---|---|---|---|
| **Light** | {{LIGHT_INTENT}} | Cheapest/fastest mode · most economical model · single agent, no sub-agents. | Low |
| **Standard** | {{STANDARD_INTENT}} | Balanced model · default/raised reasoning · focused sub-agents per category **only if your platform runs concurrent workers** (else stay single-agent). | Balanced |
| **Heavy** | {{HEAVY_INTENT}} | Most capable model + largest context · deepest reasoning (max/xhigh) · maximum sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

**Per-platform Heavy lever** (use your host's): Claude Code → Dynamic Workflows / `ultracode` (≤16 concurrent agents); OpenAI Codex → `xhigh` effort + subagents + Cloud `--attempts`; Cursor → Max Mode + Cloud Agents; Antigravity → Agent Manager + Planning Mode; Amp → deep mode + Oracle + subagents; GitHub Copilot → Cloud agent + high Thinking Effort; Goose → subagents + Goosetown; JetBrains → Junie Brave + Junie CLI. **No concurrent-worker fan-out** — single-agent at every tier, escalate by model + reasoning only: **Gemini CLI · Cline · Windsurf** (in-session).
