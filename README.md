<div align="center">

# 🐤 CoalMine

**9 Quality-Safeguard Canaries for AI Coding Agents** — Detect code rot, weak rules, hallucinations, supply-chain vulnerabilities, brittle architectures, and API contract drift before they pollute your codebase.

![license](https://img.shields.io/badge/license-MIT-blue)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_12%2B_agents-success)
![skills](https://img.shields.io/badge/skills-9-success)
![agents](https://img.shields.io/badge/works_with-12_agents_·_Claude_·_Cursor_·_Windsurf_·_more-informational)

</div>

---

## 🐤 The 9 Canaries

| Skill Name | Catches | Run Mode |
|---|---|---|
| **`rotcanary`** | Dead code · hidden bugs · resource leaks · race conditions · silent failures · stale docs | **Auto + Manual** (runs on session end / manual trigger) |
| **`gold-standard`** | Audits project completeness against world-class exemplars · FILL · ADOPT · CONFORM | **One-time** (triggered once, governs the session) |
| **`source-grounding`** | Prevents AI hallucinations by forcing cross-source verification | **Always-on** (background rule for all chat sessions) |
| **`supply-chain-audit`** | Audits dependency vulnerabilities, licenses, phone-home code, and build/CI security | **On-demand** (manually run when relevant) |
| **`resilience-audit`** | Audits failure path handling (FMEA), rollbacks, retry limits, and idempotency | **On-demand** (manually run when relevant) |
| **`telemetry-canary`** | Audits observability, log structures, metrics, and telemetry quality | **On-demand** (manually run when relevant) |
| **`testability-canary`** | Audits testing ease, code coupling, mockability, and Dependency Injection (DI) | **On-demand** (manually run when relevant) |
| **`scale-canary`** | Audits performance scaling issues, $O(N^2)$ loops, and duplicate (N+1) database queries | **On-demand** (manually run when relevant) |
| **`drift-canary`** | Prevents contract and schema drift (API/database contract inconsistencies) | **On-demand** (manually run when relevant) |

*Run Mode Explanations:*
* 📌 **Always-on:** Operates implicitly in the chat background to verify facts and filter out AI hallucinations.
* 🔄 **Auto + Manual:** Automatically scans affected files at the end of the session via git hooks, or can be triggered manually using `/rotcanary`.
* ⚡ **One-time:** Triggered once to scan, audit, and fill project-local rules that bind the agent's behavior for the rest of the session.
* 🎯 **On-demand:** Run manually when performing specific relevant tasks (e.g., adding packages, modifying database schemas) to conserve tokens and maintain agility.

*All canaries are designed around the principles of: **grounding in evidence · zero grade inflation · report before fixing**. Code changes are made only upon explicit approval via the choices menu using a safe loop: `Create checkpoint (stash/commit) → Apply safe fix → Run build + tests → Auto-revert if tests fail`.*

---

## 📝 Ultra-Short Summary Format

To prevent alert fatigue and conserve token budget, the canaries report findings in the most concise format possible:

* **Clean Scan (Success):**
  ```text
  ✅ [CoalMine] All 9 canaries passed: 0 issues flagged.
  ```
* **Issues Flagged (Warning):**
  ```text
  ⚠️ [CoalMine] 9 canaries flagged 3 issues:
    - [rotcanary] [Medium] [utils.js:45] · resource leak (unclosed file stream)
    - [supply-chain] [High] [package.json] · CVE-2026-1234 vulnerability in package 'foo'
    - [scale] [Low] [db.js:12] · nested query (N+1 query in loop)
  ```
  *(The report only prints direct findings with zero conversational filler.)*

---

## ⚡ Escalation Tiers

Canaries offer flexible execution tiers based on work complexity to optimize token usage:

| Tier | Trigger Condition | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Small scope / targeted review | Run by the primary agent, quick and lightweight | Very Low 🟢 |
| **Standard** | Moderate scope / module review | Multi-threaded task routing and detailed verification | Moderate 🟡 |
| **Heavy** | Large scope / whole-repo / release prep | Full sub-agent fan-out and deep code-path verification | High 🔴 |

---

## 🛡️ Work Execution Gate & Haldane Safety

1. **Work Execution Gate (Agent Context only):**
   Before initiating significant tasks, the agent will present an interactive choices menu (or text-based list if not supported) for confirmation:
   * **ทำทันที / Do now** — Assess scope, recommend tier, and execute immediately (spawning sub-agents if supported and warranted).
   * **เก็บเข้าแผนงาน / Add to plan** — Queue the task in `task.md` (no tier selected yet) and continue the conversation.
   * **ดูแผนงานทั้งหมด / View full plan** — Display all queued tasks as a table, recommend tiers, adjust selections, and run them.
2. **Haldane Safety Protocol (for sub-agents):**
   * Files actively being edited by sub-agents are marked `[/] in-flight` in `task.md` to prevent write collisions.
   * **Switching Topics:** If the conversation drifts toward topics affecting in-flight files, the agent will warn the user first. To discuss a new topic safely, queue the work (`task.md` -> Add to plan) and continue discussing in the main thread.
3. **Proactive Suggestions:**
   * The agent monitors chat context. If a change matches one of the 6 On-demand canaries (e.g., adding a package, updating database schema), the agent will proactively trigger the `ask_question` tool to offer a canary run, rather than typing plain-text questions.

---

## 🔌 Universal Agent Support

`SKILL.md` is an **open standard** compatible with all major AI coding agents:

| AI Agent | Target Skills Folder | Installation Shortcut | Choice Tool Support |
|---|---|---|---|
| **Claude Code** | `~/.claude/skills/` | `/plugin install coalmine@coalmine` | ✅ **Native UI:** Supports direct tool modals |
| **Antigravity** | `.agents/skills/` | `node scripts/install.mjs antigravity` | ✅ **Native UI:** Supports direct tool modals |
| **Cursor** | `.cursor/skills/` | `node scripts/install.mjs cursor` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Windsurf** | `.windsurf/skills/` | `node scripts/install.mjs windsurf` | ⚠️ **Text Fallback:** Interactive console prompt |
| **GitHub Copilot** | `.github/skills/` | `node scripts/install.mjs copilot` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Cline** | `.agents/skills/` | `node scripts/install.mjs cline` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Roo Code** | `.agents/skills/` | `node scripts/install.mjs roocode` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Gemini CLI** | `.gemini/skills/` | `node scripts/install.mjs gemini` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Goose** | `.agents/skills/` | `node scripts/install.mjs goose` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Amp** | `.agents/skills/` | `node scripts/install.mjs amp` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Junie** | `.agents/skills/` | `node scripts/install.mjs junie` | ⚠️ **Text Fallback:** Interactive console prompt |
| **Codex** | `~/.codex/skills/` | `node scripts/install.mjs codex` | ⚠️ **Text Fallback:** Interactive console prompt |

---

## 🚀 Installation & Verification (via Release v1.0.0)

### 1. Download or Clone the Stable Release v1.0.0
To ensure stability and prevent breaking changes from ongoing development in the `main` branch, download the release archive or clone the specific `v1.0.0` tag:
```bash
git clone -b v1.0.0 https://github.com/HetCreep/CoalMine.git
cd CoalMine
```

### 2. Land the Skills in Your Agent's Workspace
Run the conformed installer script, providing your target agent name (from the table above) or a custom folder path:
```bash
node scripts/install.mjs <agent|PATH>
```
*Example (Google Antigravity):*
```bash
node scripts/install.mjs antigravity
```

### 3. Verify Installation
Verify that all 9 skills have landed correctly without unresolved template markers:
```bash
node scripts/verify.mjs <agent|PATH>
```
*Example (Google Antigravity):*
```bash
node scripts/verify.mjs antigravity
```

### 4. Manual Fallback (If Skill Discovery is Unsupported)
If your agent does not support auto-discovery of skills, copy the body of the conformed `SKILL.md` (excluding the YAML frontmatter) directly into your workspace rules file (e.g., `.cursorrules`, `.windsurfrules`, `.clinerules`, or `AGENTS.md`).

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
