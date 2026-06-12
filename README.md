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
* 🔄 **Auto + Manual:** Automatically scans affected files at session end via agent lifecycle hooks — auto-wired by the Claude Code plugin only. Manual wiring snippets for Copilot/Cursor/Gemini/Codex/Antigravity ship in [`platform-configs/hooks/`](platform-configs/hooks/). Elsewhere, trigger manually with `/rotcanary`.
* ⚡ **One-time:** Triggered once to scan, audit, and fill project-local rules that bind the agent's behavior for the rest of the session.
* 🎯 **On-demand:** Run manually when performing specific relevant tasks (e.g., adding packages, modifying database schemas) to conserve tokens and maintain agility.

*All canaries are designed around the principles of **grounding in evidence · zero grade inflation · report before fixing**. Code changes are made only upon explicit approval via the choices menu using a safe loop: `Create checkpoint (stash/commit) → Apply safe fix → Run build + tests → Auto-revert if tests fail`.*

---

## 📝 Ultra-Short Summary Format

To prevent alert fatigue and conserve token budget, every canary reports in the same lean shape (defined in each skill's Output section): a one-line verdict, then a severity table of CONFIRMED findings only — no conversational filler.

```text
| # | path:line | category | severity | finding | evidence |
```

Clean scan = one line ("nothing material found"). Severity scale everywhere: CRITICAL · HIGH · MEDIUM · LOW.

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
   Before initiating significant tasks, the agent will present an interactive choices menu (or a text-based list if not supported) for confirmation:
   * **ทำทันที / Do now** — Assess scope, recommend tier, and execute immediately (spawning sub-agents if supported and warranted).
   * **เก็บเข้าแผนงาน / Add to plan** — Queue the task in `task.md` (no tier selected yet) and continue the conversation.
   * **ดูแผนงานทั้งหมด / View full plan** — Display all queued tasks as a table, recommend tiers, adjust selections, and run them.
2. **Haldane Safety Protocol (for sub-agents):**
   * Files actively being edited by sub-agents are marked `[/] in-flight` in `task.md` to prevent write collisions.
   * **Switching Topics:** If the conversation drifts toward topics affecting in-flight files, the agent will warn the user first. To discuss a new topic safely, queue the work (`task.md` -> Add to plan) and continue discussing in the main thread.
3. **Proactive Suggestions:**
   * The agent monitors chat context. If a change matches one of the 6 On-demand canaries (e.g., adding a package, updating a database schema), the agent will proactively trigger the `ask_question` tool to offer a canary run, rather than typing plain-text questions.

---

## 🔌 Universal Agent Support

`SKILL.md` is an **open standard** compatible with all major AI coding agents:

| AI Agent | Target Skills Folder | Installation Shortcut | Choice Tool Support |
|---|---|---|---|
| **Claude Code** | plugin cache (recommended) or `~/.claude/skills/` via installer | `/plugin install coalmine@coalmine` | ✅ **Native:** `AskUserQuestion` |
| **Antigravity** | `.agents/skills/` | `node scripts/install.mjs antigravity` | ✅ **Native:** built-in question prompt |
| **Cursor** | `.cursor/skills/` | `node scripts/install.mjs cursor` | ✅ **Native:** built-in ask-question tool |
| **Windsurf** | `.windsurf/skills/` | `node scripts/install.mjs windsurf` | ✅ **Native:** `suggested_responses` |
| **GitHub Copilot** | `.github/skills/` | `node scripts/install.mjs copilot` | ✅ **Native:** `askQuestions` |
| **Cline** | `.agents/skills/` | `node scripts/install.mjs cline` | ✅ **Native:** `ask_question` |
| **Roo Code** † | `.agents/skills/` | `node scripts/install.mjs roocode` | ✅ **Native:** `ask_followup_question` |
| **Gemini CLI** | `.gemini/skills/` | `node scripts/install.mjs gemini` | ✅ **Native:** `ask_user` |
| **Goose** | `.agents/skills/` | `node scripts/install.mjs goose` | ⚠️ **Text Fallback:** no question tool |
| **Amp** | `.agents/skills/` | `node scripts/install.mjs amp` | ⚠️ **Text Fallback:** tool not documented |
| **Junie** | `.junie/skills/` | `node scripts/install.mjs junie` | ⚠️ **Text Fallback:** tool not documented |
| **Codex** | `.agents/skills/` | `node scripts/install.mjs codex` | ✅ **Native:** `request_user_input` |

† Roo Code upstream repo archived 2026-05; skills keep working in existing installs and forks.

*Skill paths verified against vendor docs (Jun 2026). `SKILL.md` follows the cross-vendor [Agent Skills spec](https://agentskills.io/specification); most agents also read the shared `.agents/skills/` convention, and several additionally read `.claude/skills/` (Copilot, Cursor, Windsurf, Cline). Frontmatter quirks: Junie requires only `name`, Antigravity requires `description` — CoalMine ships both, satisfying every variant.*

### What ports where

| Part | Portable? |
|---|---|
| The 9 skills (the audits) | ✅ all 12 targets natively via the Agent Skills spec |
| Interactive choice menus (`ask_question`) | ✅ native question tools on 9 of 12 (see table); text fallback on Goose/Amp/Junie |
| Sub-agent fan-out + tiers | ✅ on any host with a sub-agent system; inline otherwise |
| rotcanary **auto-cadence** | ✅ auto-wired on Claude Code (plugin) · 🔧 manual snippets in [`platform-configs/hooks/`](platform-configs/hooks/) for Copilot, Cursor, Gemini CLI, Codex, Antigravity · ⛔ no stop event on Cline/Junie — run manually |

**Fallback for agents without skill discovery:** copy a **conformed** skill body — from [`plugin/skills/<name>/SKILL.md`](plugin/skills/) or an installed target, **never** from `skills/` (those are templates with unresolved `<!-- SHARED:* -->` markers) — into the agent's rules file / `AGENTS.md`, and strip the YAML frontmatter.

---

## 🚀 Installation & Verification

### Option A — Claude Code Plugin Marketplace (no clone needed)
```text
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```
The marketplace serves the committed [`plugin/`](plugin/) dist — the **same conformed skills** `install.mjs` produces (shared sections fully injected), plus the rotcanary auto-cadence hooks wired automatically.

> 🔧 **Maintainers:** `plugin/` is generated output — never hand-edit it. After changing `skills/`, `skills/_shared/`, `hooks/`, or `.claude-plugin/plugin.json`, run `node scripts/build-plugin.mjs`. `verify.mjs` (and the pre-commit hook) FAILs while the dist is stale.

### Option B — Universal Installer (all 12+ agents)

#### 1. Clone the Repository
```bash
git clone https://github.com/HetCreep/CoalMine.git
```

#### 2. Land the Skills in Your Agent's Workspace
Run the installer **from YOUR project's root directory** (project-scoped targets resolve against the current directory — running it inside the CoalMine clone would install into the clone itself). Provide your target agent name (from the table above) or a custom folder path:
```bash
cd /path/to/your-project
node /path/to/CoalMine/scripts/install.mjs <agent|PATH>
```
*Example (Google Antigravity):*
```bash
node ../CoalMine/scripts/install.mjs antigravity
```
The installer also writes a CoalMine pre-commit/pre-push gate into your project's `.git/hooks` (any existing non-CoalMine hook is backed up once as `<hook>.pre-coalmine`; `--uninstall` restores it).

Upgrades are clean by design: each install writes a `.coalmine-manifest.json` at the target and the next install removes exactly that set first — renamed or retired skills never leave stale copies, and skills from other tools in the same folder are never touched.

#### 3. Verify Installation
From the same directory, verify that all 9 skills landed without unresolved template markers:
```bash
node /path/to/CoalMine/scripts/verify.mjs <agent|PATH>
```

#### 4. Uninstallation / Cleanup
To cleanly remove installed skills, clear platform trigger configurations, and restore backed-up git hooks:
```bash
node scripts/install.mjs --uninstall <agent|PATH>
```
*Example (Google Antigravity):*
```bash
node scripts/install.mjs --uninstall antigravity
```

#### 5. Manual Fallback (If Skill Discovery is Unsupported)
If your agent does not support auto-discovery of skills, copy the body of the conformed `SKILL.md` (excluding the YAML frontmatter) directly into your workspace rules file (e.g., `.cursorrules`, `.windsurfrules`, `.clinerules`, or `AGENTS.md`).

---

## 🧭 Design Principles

Every component is bound by the 11 principles of the [Quantum Computer Spec](DESIGN-PRINCIPLES.md) — maximum performance, zero visible errors, single-brand internals, minimum power, essential accessories only, error correction, determinism, isolation, measurement, trustworthiness, and entanglement.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
