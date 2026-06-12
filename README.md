<div align="center">

# 🐤 CoalMine

**9 Quality-Safeguard Canaries for AI Coding Agents** — Detect code rot, weak rules, hallucinations, supply-chain vulnerabilities, brittle architectures, and API contract drift before they pollute your codebase.

![version](https://img.shields.io/github/v/tag/HetCreep/CoalMine?label=version&color=blue)
![license](https://img.shields.io/badge/license-MIT-blue)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_12%2B_agents-success)
![skills](https://img.shields.io/badge/skills-9-success)
![agents](https://img.shields.io/badge/works_with-12_agents_·_Claude_·_Cursor_·_Windsurf_·_more-informational)

[Design Principles](DESIGN-PRINCIPLES.md) · [Eval Results](eval/RESULTS.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Privacy](PRIVACY.md) · [Releases](https://github.com/HetCreep/CoalMine/releases)

</div>

---

## 🐤 The 9 Canaries

| Skill Name | Catches | Run Mode |
|---|---|---|
| **`rot-canary`** | Dead code · hidden bugs · resource leaks · race conditions · silent failures · stale docs | **Auto + Manual** (runs on session end / manual trigger) |
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
* 🔄 **Auto + Manual:** Automatically scans affected files at session end via agent lifecycle hooks — auto-wired by the Claude Code plugin only. Manual wiring snippets for Copilot/Cursor/Gemini/Codex/Antigravity ship in [`platform-configs/hooks/`](platform-configs/hooks/). Elsewhere, trigger manually with `/rot-canary`.
* ⚡ **One-time:** Triggered once to scan, audit, and fill project-local rules that bind the agent's behavior for the rest of the session.
* 🎯 **On-demand:** Run manually when performing specific relevant tasks (e.g., adding packages, modifying database schemas) to conserve tokens and maintain agility.

*All canaries are designed around the principles of **grounding in evidence · zero grade inflation · report before fixing**. Code changes are made only upon explicit approval via the choices menu using a safe loop: `Create checkpoint (stash/commit) → Apply safe fix → Run build + tests → Auto-revert if tests fail`.*

---

## 🔋 One button: install — the suite drives itself

You memorize nothing. Installing is the power button; from there the agent conducts the canaries and asks before anything costs you tokens:

| What | When it fires | Your part |
|---|---|---|
| **gold-standard** | Offered once when a project has no golden rules yet, and again whenever a rule's `revalidate` date passes | Pick Run now / Queue / Skip |
| **rot-canary** | Auto-scans every session's touched files at session end (QUICK, capped); findings end with a fix menu | Pick a fix option — nothing is changed without one |
| **The 6 specialists** | Offered the moment your conversation enters their domain (deps → supply-chain, schema → drift, async → resilience, loops → scale, tests → testability, logging → telemetry) | Accept or skip |
| **source-grounding** | Standing rule — version-sensitive facts get verified against live sources during any canary run | — |

Consent rule (Design Principle 4): nothing expensive ever runs silently — it is offered via your agent's question tool, or covered by the standing auto-scan consent you gave by installing (revocable: `.coalmine.json`, `~/.claude/.rot-canary-off`, or `--uninstall`).

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

## ⚙️ Configuration (.coalmine.json)

CoalMine adapts dynamically to the developer's skill level and preferences:
* **For General Users (Zero-Config / "ชาวบ้าน"):** The installer automatically generates a ready-made `.coalmine.json` file at the root of the project pre-configured with safe, token-optimal, and secure gold-standard defaults, meaning they can run it out of the box with zero effort.
* **For Programmers (Advanced Overrides):** The automatically generated `.coalmine.json` file contains inline descriptive comments explaining every key, type, and default value. Programmers can directly modify this file (manually or via the Agent) or run the configurator tool to adjust settings as they like.

### Configuration Schema

| Key | Type | Default | Description |
|---|---|---|---|
| `language` | String | `auto` | Override heuristic language detection (`en` \| `th` \| `ja` \| `zh` \| `es`) |
| `defaultTier` | String | `auto` | Force an execution tier for every canary run (`Light` \| `Standard` \| `Heavy`) |
| `autoScanFileCap` | Number | `10` | Maximum touched files allowed to scan automatically at session end before capping |
| `tripwireMaxFileSizeKb` | Number | `100` | Size limit in KB for files analyzed by editor tripwire checks (e.g. merge conflict smells) |
| `enableConductor` | Boolean | `true` | Set to `false` to disable rules injection on Session Start (legacy alias: `conductor`) |
| `disabledCanaries` | Array of Strings | `[]` | Canaries to disable (e.g. `["rot-canary", "drift-canary"]` or `["all"]`; legacy alias: `disable`) |

The generated `.coalmine.json` documents the **full schema** — every key, grouped and commented (see `platform-configs/.coalmine.json`); `scripts/verify.mjs` validates keys and types.

### Configurator Utility

Programmers can easily view, write, and update `.coalmine.json` configurations using the built-in utility script:
```bash
# Set language override to Thai and file cap limit to 15
node scripts/configure.mjs --language th --file-cap 15

# Disable specific canaries
node scripts/configure.mjs --disable rot-canary,drift-canary
```

---

## 📊 Measured detection quality

"Antivirus-grade" needs a number, not an adjective — so CoalMine ships an AV-Comparatives-style [eval harness](eval/README.md): fixtures with **planted, line-labeled defects** plus **clean decoys**, scored mechanically (no judgment calls at scoring time).

| Canary | Recall | Precision | Decoy false-positives | Severity accuracy | Corpus |
|---|---|---|---|---|---|
| `rot-canary` | **100%** (13/13) | **100%** | **0**/4 decoys | 100% | 16 fixtures · 7 categories |

Latest scored run: [eval/RESULTS.md](eval/RESULTS.md) (model- and skill-version-stamped — re-run on any model or skill change to catch regressions). The baseline run is self-authored; treat it as a regression floor, not an independent benchmark.

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
| rot-canary **auto-cadence** | ✅ auto-wired on Claude Code (plugin) · 🔧 manual snippets in [`platform-configs/hooks/`](platform-configs/hooks/) for Copilot, Cursor, Gemini CLI, Codex, Antigravity · ⛔ no stop event on Cline/Junie — run manually |

**Fallback for agents without skill discovery:** copy a **conformed** skill body — from [`plugin/skills/<name>/SKILL.md`](plugin/skills/) or an installed target, **never** from `skills/` (those are templates with unresolved `<!-- SHARED:* -->` markers) — into the agent's rules file / `AGENTS.md`, and strip the YAML frontmatter.

---

## 🚀 Installation & Verification

### Option A — Claude Code Plugin Marketplace (no clone needed)
```text
/plugin marketplace add HetCreep/CoalMine
/plugin install coalmine@coalmine
```
The marketplace serves the committed [`plugin/`](plugin/) dist — the **same conformed skills** `install.mjs` produces (shared sections fully injected), plus the rot-canary auto-cadence hooks wired automatically.

> 🔧 **Maintainers:** `plugin/` is generated output — never hand-edit it. After changing `skills/`, `skills/_shared/`, `hooks/`, or `.claude-plugin/plugin.json`, run `node scripts/build-plugin.mjs`. `verify.mjs` (and the pre-commit hook) FAILs while the dist is stale.

### Option A2 — skills.sh (any agent, one line)
```bash
npx skills add HetCreep/CoalMine
```

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
