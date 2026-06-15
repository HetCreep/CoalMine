<div align="center">

# 🐤 CoalMine

**9 Quality-Safeguard Canaries for AI Coding Agents** — Detect code rot, weak rules, hallucinations, supply-chain vulnerabilities, brittle architectures, and API contract drift before they pollute your codebase.

![version](https://img.shields.io/github/v/tag/HetCreep/CoalMine?label=version&color=blue)
![license](https://img.shields.io/badge/license-MIT-blue)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_major_agents-success)
![skills](https://img.shields.io/badge/skills-9-success)
![agents](https://img.shields.io/badge/works_with-major_agents_·_Claude_·_Cursor_·_Windsurf-informational)

[Design Principles](https://github.com/TheColliery/.github/blob/main/DESIGN-PRINCIPLES.md) · [Eval Results](https://github.com/TheColliery/.github/blob/main/benchmarks/CoalMine/RESULTS.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Privacy](PRIVACY.md) · [Releases](https://github.com/HetCreep/CoalMine/releases)

**Part of [TheColliery](https://github.com/TheColliery)** — Sibling of **[CoalTipple](https://github.com/TheColliery/CoalTipple)**.

</div>

---

## 🐤 The 9 Canaries

| Skill Name | Catches | Run Mode |
|---|---|---|
| **`rot-canary`** | Dead code, bugs, resource leaks, race conditions, silent failures, stale docs | **Auto + Manual** (runs on session end / manual trigger) |
| **`gold-standard`** | Audits project completeness against world-class exemplars | **One-time** (triggered once, governs the session) |
| **`source-grounding`** | Prevents AI hallucinations by forcing cross-source verification | **Always-on** (background rule for all chat sessions) |
| **`supply-chain-audit`** | Audits dependency vulnerabilities, licenses, phone-home code, and build/CI security | **On-demand** (manually run when relevant) |
| **`resilience-audit`** | Audits failure path handling (FMEA), rollbacks, retry limits, and idempotency | **On-demand** (manually run when relevant) |
| **`telemetry-canary`** | Audits observability, log structures, metrics, and telemetry quality | **On-demand** (manually run when relevant) |
| **`testability-canary`** | Audits testing ease, code coupling, mockability, and Dependency Injection (DI) | **On-demand** (manually run when relevant) |
| **`scale-canary`** | Audits performance scaling issues, $O(N^2)$ loops, and duplicate (N+1) database queries | **On-demand** (manually run when relevant) |
| **`drift-canary`** | Prevents contract and schema drift (API/database contract inconsistencies) | **On-demand** (manually run when relevant) |

*Run Mode Details:*
* 📌 **Always-on:** Runs implicitly in the background to verify facts.
* 🔄 **Auto + Manual:** Scans affected files at session end via lifecycle hooks (auto-wired in Claude Code; manual snippets in [`platform-configs/hooks/`](platform-configs/hooks/) for other agents). Manual trigger via `/rot-canary`.
* ⚡ **One-time:** Governs the session by scanning and filling project-local rules.
* 🎯 **On-demand:** Manually run for specific tasks to conserve tokens.

*Canaries follow **grounding in evidence, zero grade inflation, and report before fixing**. Fixes apply through a safe loop: `Stash/Commit -> Apply fix -> Run build+tests -> Auto-revert if tests fail`.*

---

## 🔌 Universal Agent Support

`SKILL.md` is an **open standard** compatible with all major AI coding agents:

| AI Agent | Target Skills Folder | Installation Shortcut | Choice Tool Support |
|---|---|---|---|
| **Claude Code** | plugin cache (recommended) or `~/.claude/skills/` | `/plugin install coalmine@coalmine` | ✅ **Native:** `AskUserQuestion` |
| **Antigravity** | `.agents/skills/` | `node scripts/install.mjs antigravity` | ✅ **Native:** built-in question prompt |
| **Cursor** | `.cursor/skills/` | `node scripts/install.mjs cursor` | ✅ **Native:** built-in ask-question tool |
| **Windsurf** | `.windsurf/skills/` | `node scripts/install.mjs windsurf` | ✅ **Native:** `suggested_responses` |
| **GitHub Copilot** | `.github/skills/` | `node scripts/install.mjs copilot` | ✅ **Native:** `askQuestions` |
| **Cline** | `.claude/skills/` | `node scripts/install.mjs cline` | ✅ **Native:** `ask_question` |
| **Gemini CLI** | `.gemini/skills/` | `node scripts/install.mjs gemini` | ✅ **Native:** `ask_user` |
| **Goose** | `.agents/skills/` | `node scripts/install.mjs goose` | ⚠️ **Text Fallback:** no question tool |
| **Amp** | `.agents/skills/` | `node scripts/install.mjs amp` | ⚠️ **Text Fallback:** tool not documented |
| **Junie** | `.junie/skills/` | `node scripts/install.mjs junie` | ⚠️ **Text Fallback:** tool not documented |
| **Codex** | `.agents/skills/` | `node scripts/install.mjs codex` | ✅ **Native:** `request_user_input` |

*Skill paths follow the cross-vendor [Agent Skills spec](https://agentskills.io/specification). Cline reads `.claude/skills/`, Junie reads `.junie/skills/`, others use `.agents/skills/`.*

### What ports where

| Part | Portable? |
|---|---|
| The 9 skills (the audits) | ✅ All targets natively via Agent Skills spec |
| Interactive choice menus (`ask_question`) | ✅ Native question tools on most agents; text fallback on Goose/Amp/Junie |
| Sub-agent fan-out + tiers | ✅ Supported if host has sub-agent system; inline fallback |
| rot-canary **auto-cadence** | ✅ Auto-wired on Claude Code; 🔧 manual snippets in [`platform-configs/hooks/`](platform-configs/hooks/) for other major agents; ⛔ unsupported on Cline/Junie |

**Manual Fallback:** Copy conformed skill body from [`plugin/skills/<name>/SKILL.md`](plugin/skills/) (strip YAML frontmatter) into `AGENTS.md` / rules file.

---

## 🚀 Installation & Verification

### Option A — Claude Code Plugin (No clone needed)
```text
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```

> 🔧 **Maintainers:** `plugin/` is generated output. After edits in `skills/`, `skills/_shared/`, `hooks/`, or `.claude-plugin/plugin.json`, run `node scripts/build-plugin.mjs`.

### Option A2 — skills.sh (One line)
```bash
npx skills add HetCreep/CoalMine
```

### Option B — Universal Installer

#### 1. Clone the Repository
```bash
git clone https://github.com/HetCreep/CoalMine.git
```

#### 2. Run the Installer
Run from **your project's root folder** (not inside the CoalMine clone):
```bash
cd /path/to/your-project
node /path/to/CoalMine/scripts/install.mjs <agent|all|PATH>
```
* `all` auto-detects and installs to all configured agents in the directory.
* The installer sets up pre-commit/pre-push gates in `.git/hooks`, writes trigger rules, and generates `.coalmine.json` config.

#### 3. Verify & Uninstall
* **Verify:** `node /path/to/CoalMine/scripts/verify.mjs <agent|PATH>`
* **Uninstall:** `node scripts/install.mjs --uninstall <agent|PATH>`

---

## 🔋 One button: install — the suite drives itself

Installing is the power button. The agent conducts the canaries and asks for consent before running expensive tasks:

| What | When it fires | Your part |
|---|---|---|
| **gold-standard** | Offered once on new projects, and again when a rule's `revalidate` date passes | Run now / Queue / Skip |
| **rot-canary** | Auto-scans touched files at session end (QUICK); findings end with a fix menu | Choose a fix option |
| **Specialists** | Offered when conversation enters their domain (deps, schemas, async, loops, etc.) | Accept / Skip |
| **source-grounding** | Always-on background fact verification | — |

*Consent Rule:* Nothing expensive runs silently. Revocable via `.coalmine.json`, `~/.claude/.rot-canary-off`, or `--uninstall`.

---

## 🛡️ Work Execution Gate & Haldane Safety

1. **Work Execution Gate:** Before starting a task, the agent presents a confirm menu:
   * **ทำทันที / Do now** — Assess scope, recommend tier, and execute.
   * **เก็บเข้าแผนงาน / Add to plan** — Queue in `task.md`.
   * **ดูแผนงานทั้งหมด / View full plan** — View queued tasks, adjust tiers, and run.
2. **Haldane Safety Protocol (for sub-agents):**
   * Active files edited by sub-agents are marked `[/] in-flight` in `task.md` to prevent collisions.
   * If conversation shifts to topics affecting in-flight files, the agent warns you first.
3. **Proactive Suggestions:** The agent automatically offers canary runs via `ask_question` when relevant changes (e.g., adding a package) are detected.

---

## ⚙️ Configuration (.coalmine.json)

* **General Users (Zero-Config):** Automatically generated `.coalmine.json` pre-configured with safe, token-optimal defaults.
* **Programmers (Overrides):** Inline comments document every key. Run the configurator tool or edit manually.

### Configuration Schema

| Key | Type | Default | Description |
|---|---|---|---|
| `language` | String | `auto` | Override language detection (`en` \| `th` \| `ja` \| `zh` \| `es`) |
| `defaultTier` | String | `auto` | Force execution tier (`Light` \| `Standard` \| `Heavy`) |
| `autoScanFileCap` | Number | `10` | Maximum touched files to scan at session end |
| `tripwireMaxFileSizeKb` | Number | `100` | Size limit in KB for editor conflict checks |
| `enableConductor` | Boolean | `true` | Set false to disable rules injection on Session Start |
| `disabledCanaries` | Array | `[]` | Canaries to disable (e.g. `["rot-canary"]` or `["all"]`) |

### Configurator Utility
```bash
# Set language and cap limit
node scripts/configure.mjs --language th --file-cap 15

# Disable specific canaries
node scripts/configure.mjs --disable rot-canary,drift-canary
```

---

## 📝 Ultra-Short Summary Format

Canaries report in a lean shape (one-line verdict + severity table of confirmed findings) to save tokens:
```text
| # | path:line | category | severity | finding | evidence |
```
*Severity levels:* CRITICAL · HIGH · MEDIUM · LOW. Clean scan outputs a single line.

---

## ⚡ Escalation Tiers

| Tier | Trigger | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Small scope / targeted review | Primary agent, quick | Very Low 🟢 |
| **Standard** | Moderate scope / module review | Multi-threaded routing, detailed | Moderate 🟡 |
| **Heavy** | Large scope / release prep | Sub-agent fan-out, deep paths | High 🔴 |

---

## 📊 Measured detection quality

AV-Comparatives-style [eval harness](https://github.com/TheColliery/.github/blob/main/benchmarks/CoalMine/README.md) results scored mechanically over 16 fixtures:

| Canary | Engine | Recall | Precision | Decoy FPs | Severity accuracy |
|---|---|---|---|---|---|
| `rot-canary` | `claude-fable-5` (Baseline) | **100%** (13/13) | **100%** | **0**/4 | 13/13 |
| `rot-canary` | `Antigravity` (Blind) | **100%** (13/13) | **100%** | **0**/4 | 12/13 |

*Measured 2026-06-13 (v3.4.0). Detailed log: [RESULTS.md](https://github.com/TheColliery/.github/blob/main/benchmarks/CoalMine/RESULTS.md).*

---

## 🧭 Design Principles

Bound by the 11 principles of the [Quantum Computer Spec](https://github.com/TheColliery/.github/blob/main/DESIGN-PRINCIPLES.md): maximum performance, zero visible errors, single-brand, minimum power, essential accessories, error correction, determinism, isolation, trustworthiness, and entanglement.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
