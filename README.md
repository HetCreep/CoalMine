<div align="center">

# 🐤 CoalMine

> *A mine's canary dies first so the miners live — these nine die first so your codebase lives.*

**9 Quality-Safeguard Canaries for AI Coding Agents** — Detect code rot, weak rules, hallucinations, supply-chain vulnerabilities, brittle architectures, and API contract drift before they pollute your codebase.

![version](https://img.shields.io/github/v/tag/HetCreep/CoalMine?label=version&color=blue)
![license](https://img.shields.io/badge/license-Apache_2.0-blue)
![status](https://img.shields.io/badge/status-live-brightgreen)
![SKILL.md](https://img.shields.io/badge/SKILL.md-open_standard_·_major_agents-success)
![skills](https://img.shields.io/badge/skills-9-success)

![Claude Code](https://img.shields.io/badge/Claude_Code-validated-brightgreen)
![Antigravity](https://img.shields.io/badge/Antigravity-validated-brightgreen)
![Cursor](https://img.shields.io/badge/Cursor-works_with-blue)
![Codex](https://img.shields.io/badge/Codex-works_with-blue)
![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-works_with-blue)
![Cline](https://img.shields.io/badge/Cline-works_with-blue)
![Copilot](https://img.shields.io/badge/Copilot-works_with-blue)
![claude.ai](https://img.shields.io/badge/claude.ai-works_with-blue)

[Design Principles](https://github.com/TheColliery/.github/blob/main/DESIGN-PRINCIPLES.md) · [Benchmark](https://github.com/TheColliery/.github/tree/main/benchmarks/CoalMine) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md) · [Privacy](PRIVACY.md) · [Releases](https://github.com/HetCreep/CoalMine/releases)

**Part of [TheColliery](https://github.com/TheColliery)** — siblings: **[CoalTipple](https://github.com/TheColliery/CoalTipple)** (model/effort routing) · **[CoalBoard](https://github.com/TheColliery/CoalBoard)** (consensus & debate board) · **[CoalHearth](https://github.com/TheColliery/CoalHearth)** (session warm-resume) · **[CoalFace](https://github.com/TheColliery/CoalFace)** (fan-out discipline) · **[CoalWash](https://github.com/TheColliery/CoalWash)** (memory defrag) · **[CoalLedger](https://github.com/TheColliery/CoalLedger)** (docs health).

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
| **Devin Desktop (ex-Windsurf)** | `.windsurf/skills/` | `node scripts/install.mjs windsurf` | ✅ **Native:** `suggested_responses` |
| **GitHub Copilot** | `.github/skills/` | `node scripts/install.mjs copilot` | ✅ **Native:** `askQuestions` |
| **Cline** | `.claude/skills/` | `node scripts/install.mjs cline` | ✅ **Native:** `ask_question` |
| **Gemini CLI (superseded by Antigravity CLI, Jun 2026)** | `.gemini/skills/` | `node scripts/install.mjs gemini` | ✅ **Native:** `ask_user` |
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
| rot-canary **auto-cadence** | ✅ Auto-wired on Claude Code; 🔧 wired on Antigravity 2.0 via a one-time `hooks.json` copy (see Install) + manual snippets in [`platform-configs/hooks/`](platform-configs/hooks/) for other hook-capable agents; ⛔ unsupported on Cline/Junie |

**Manual Fallback:** Copy conformed skill body from [`plugin/skills/<name>/SKILL.md`](plugin/skills/) (strip YAML frontmatter) into `AGENTS.md` / rules file.

---

## 🚀 Install

**Per-platform, at a glance** — every canary is a read/analyze skill, so it runs wherever a `SKILL.md` loads; only the `rot-canary` auto-cadence hook is host-dependent (Claude Code auto-wires it; a manual snippet covers other hook-capable hosts).

| Platform | Tier | Install |
|---|---|---|
| **Claude Code** | validated | `/plugin marketplace add HetCreep/CoalMine` → `/plugin install coalmine@coalmine` (Option A) — auto-wires the `rot-canary` Stop-hook |
| **Antigravity** | validated (canaries) · **wired** (auto-cadence) | file-copy the skills to the global `~/.gemini/config/skills/` **or** per-project `<workspace>/.agents/skills/` (`node scripts/install.mjs antigravity`); for the full auto-cadence (conductor + rot-canary) on AG 2.0's hook engine, copy [`platform-configs/hooks/antigravity-hooks.json`](platform-configs/hooks/antigravity-hooks.json) to `<workspace>/.agents/hooks.json` or `~/.gemini/config/hooks.json` and adjust the CoalMine path |
| **Cursor · Codex · Cline · Copilot · Gemini CLI · …** | works with | `node scripts/install.mjs <agent>` — file-copy into the agent's skills folder (targets in [Universal Agent Support](#-universal-agent-support)) |
| **claude.ai** (web / app) | works with | ZIP-upload a canary folder from `skills/` as a custom skill (Option A3) — read/analyze skills only, manual invocation, no hooks |

**wired** (the Antigravity auto-cadence tier) = built + hermetically tested against the empirically-verified AG 2.0 hook spec (pilot 2026-07-12 — which did fire CoalMine's Stop cadence live on AG; corroborated against the official docs 2026-07-13). Delivery of the injected context into the agent is emitted per spec but not yet validated end-to-end — one real AG session run flips it to validated. The 9 canaries themselves are already validated on AG.

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

### Option A3 — claude.ai (web / desktop app)
Zip any canary's folder from `skills/` and upload it as a custom skill (Settings → Capabilities → Skills). Manual invocation only — no hooks there. Steps + capability notes: [CLAUDE-AI-INSTALL](https://github.com/TheColliery/.github/blob/main/CLAUDE-AI-INSTALL.md).

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
* Supported `<agent>`: `antigravity`, `cursor`, `codex`, `cline`, `copilot`, `windsurf`, `amp`, `goose`, `junie`, `gemini` (for `claude`, prefer the plugin above) — see [Universal Agent Support](#-universal-agent-support) for target folders + choice-tool support.
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

## ⚙️ Configure (.coalmine.json)

Zero-config to start — and two config levels when you want them: a global `~/.claude/.coalmine.json` overlaid per key by the project `<gitroot>/.coalmine.json` (project wins), so you can tune or **shut off a globally-tuned CoalMine per project** (`enableConductor: false`; `disabledCanaries: ["all"]` disables just the canary offers). The installer generates the per-project file; write the global layer with `node scripts/configure.mjs --global <flags>`. The high-impact keys:

| Key | Default | What it does |
|---|---|---|
| `language` | `auto` | Language for prompts and nudges (`auto` \| `en` \| `th` \| `ja` \| `zh` \| `es`) |
| `enableConductor` | `true` | Master switch for rules injection at session start |
| `rotCanaryMode` | `auto` | rot-canary session-end auto-scan (`auto` \| `manual` \| `off`) |
| `defaultTier` | `auto` | Force an execution tier (`Light` \| `Standard` \| `Heavy` \| `auto`) |
| `disabledCanaries` | `[]` | Canaries to disable (e.g. `["rot-canary"]` or `["all"]`) |

Full key reference: every key + default lives in [`scripts/lib/config-schema.mjs`](scripts/lib/config-schema.mjs) and the commented template [`platform-configs/.coalmine.json`](platform-configs/.coalmine.json) — or run `node scripts/configure.mjs --help`.

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

## 📊 Benchmark

**Headline (measured 2026-07-03, skill v3.8.4):** 7 canaries measured over 82 planted-defect fixtures × 4 engines (Claude Fable 5 / Opus 4.8 / Sonnet 5 / Haiku 4.5 + Gemini 3.5 Flash), K=3-5 repeated runs per arm — **recall at 100% on 6 of 7 suites for every engine · zero decoy false alarms across the entire batch (~200 clean-file opportunities)** · drift-canary is the discriminating suite (88% median — engines find every planted disagreement but split on which side is authoritative).

Each canary is measured AV-Comparatives-style — recall, precision, decoy false-positives, and severity accuracy over fixed fixture corpora, scored mechanically, cross-engine, with repeated runs (flips extend K per the locked methodology). **Honest scope:** small, dated samples authored in-project — a regression floor, not an independent benchmark; re-run on model/skill changes.

Full method, per-category scoring, and the cross-engine comparison live in the series records: [`TheColliery/.github/benchmarks/CoalMine`](https://github.com/TheColliery/.github/tree/main/benchmarks/CoalMine).

---

## 🧭 Design Principles

Bound by the 11 principles of the [Quantum Computer Spec](https://github.com/TheColliery/.github/blob/main/DESIGN-PRINCIPLES.md): maximum performance, zero visible errors, single-brand, minimum power, essential accessories, error correction, determinism, isolation, measurement, trustworthiness, and entanglement.

---

## 🏭 Part of TheColliery

CoalMine shares its engineering doctrine with [CoalTipple](https://github.com/TheColliery/CoalTipple) (model/effort routing), [CoalBoard](https://github.com/TheColliery/CoalBoard) (consensus & debate board), [CoalHearth](https://github.com/TheColliery/CoalHearth) (session warm-resume), [CoalFace](https://github.com/TheColliery/CoalFace) (fan-out discipline), [CoalWash](https://github.com/TheColliery/CoalWash) (memory defrag), and [CoalLedger](https://github.com/TheColliery/CoalLedger) (docs health): Phoenix-13 hooks (zero-dependency, no network, fail-silent, no child processes, deterministic), single-source-of-truth config schemas, and a strict no-overkill discipline. Install one and it stands alone; install all and they compose without conflict.

---

## 📄 License

Apache License 2.0. See [LICENSE](LICENSE) for details.
