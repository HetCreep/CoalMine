## Escalation — Scope & Model Quality

Tiers are **capability targets**, not platform commands — resolve each to your host's nearest lever. If your platform lacks a lever, **degrade gracefully: never fake parallelism you cannot do** — escalate via model tier + reasoning depth instead.

| Level | Intent | Capability target | Token Cost |
|---|---|---|---|
| **Light** | {{LIGHT_INTENT}} | Cheapest/fastest mode · most economical model · single agent, no sub-agents. | Low |
| **Standard** | {{STANDARD_INTENT}} | Balanced model · default/raised reasoning · focused sub-agents per category **only if your platform runs concurrent workers** (else stay single-agent). | Balanced |
| **Heavy** | {{HEAVY_INTENT}} | Most capable model + largest context · deepest reasoning (max/xhigh) · maximum sub-agent fan-out **if supported** · adversarial cross-check where available. | High |

**Per-platform Heavy lever** (use your host's, if it has concurrent fan-out): Claude Code → Dynamic Workflows / `ultracode` (≤16 concurrent agents); OpenAI Codex → `xhigh` + subagents + Cloud `--attempts`; Cursor → Max Mode + parallel Cloud Agents; Antigravity → Agent Manager; Amp → Oracle + subagents; GitHub Copilot → `/fleet` (Copilot CLI) + Cloud agent; Goose → subagents; JetBrains → Junie CLI; Gemini CLI / Cline (read-only) / Windsurf (now Devin) → subagents. **If your platform has no concurrent fan-out, escalate by model + reasoning only.** ⚠️ Subagent support CHURNS fast — most major agents added it through 2026 — so verify your platform's current capability rather than trusting any fixed list here.
