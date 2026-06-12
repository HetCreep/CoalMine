---
name: supply-chain-audit
description: >-
  Software supply chain audit — dependencies (CVEs, maintenance, licenses, transitive risk), build/CI integrity (SHA-pinned actions, lockfile, CI-only release), artifact integrity (checksums, signing, SBOM). Triggers on: "/supply-chain-audit", "supply-chain-audit", "dependency audit". Run before adding a dep, before a release, or for periodic review. Reports; does not change deps unless asked.
---

# Supply-Chain Audit

**Language:** Mirror the user's current writing language for EVERYTHING you generate at runtime — questions, answer options and menu labels, tier recommendations, report narrative, and status messages. Detect from their messages (Thai → Thai, Japanese → Japanese, …); never hardcode one language, and never fall back to English just because this skill file is written in English. Technical terms MAY stay in English where translation would hurt precision: tool/command names, file paths, code identifiers, severity labels (CRITICAL/HIGH/MEDIUM/LOW), and tier names (Light/Standard/Heavy).

Audit what the project trusts: deps, build pipeline, shipped artifact. Report; do NOT change deps unless asked.

## 1. Dependencies
- **CVEs** — run ecosystem auditor; cross-check every hit in GHSA/OSV/NVD. Cite advisory ID + affected range + fixed version. (Invoke source-grounding — never from memory.)
- **Maintenance** — last release, commit recency, bus-factor, archived/deprecated flag.
- **License** — flag copyleft inside permissive project, missing/unknown license.
- **Transitive** — full tree; name the parent to bump for a transitive fix.
- **Behavior** — phone home? install scripts? unexpected egress?

## 2. Build / CI
- CI-only release builds?
- Actions pinned to commit SHA (not floating tag)?
- Lockfile committed + enforced in CI?
- Minimal token scope? No `pull_request_target`?

## 3. Artifact
- SHA-256 checksums published for every binary?
- Signed (Authenticode/GPG)? Gap documented honestly?
- SBOM generated?
- User can verify before running?

## Tooling
Per-ecosystem vuln/license/outdated commands + offline fallback: read `references/tooling.md` when selecting scanners.

## Discipline
- Ground every CVE/fixed-version in an advisory. Never from memory.
- Don't auto-change deps — report + recommend; user decides (bumps break builds).
- State what was NOT scanned. Blocked network scans → lockfile inspection fallback (see `references/tooling.md`), mark live checks N-A.

## Output
`| package | direct/transitive | issue | severity | advisory | fixed-in | action |`
Build+artifact checklist · Summary (counts + top fixes) · Not scanned

## Fix mode (choice-gated)
After the report, present via `ask_question`:
- **Pin safe now** — commit already-present unchanged lockfile, pin CI action to current SHA, add missing checksum step. Each: checkpoint → apply → verify.
- **Let me pick** — user-selected fixes only.
- **Report only** — change nothing.

NEVER auto-fix: dep version bump, lockfile regen (re-resolves entire transitive tree).

## Escalation — Scope & Model Quality

| Level | Intent | Orchestration | Token Cost |
|---|---|---|---|
| **Light** | Single-section check, spot audit | Single agent, no sub-agents. Use your platform's most economical mode. | Low |
| **Standard** | Multi-section balanced audit | Spawn focused sub-agents per category if your platform supports it. Use your platform's balanced mode. | Balanced |
| **Heavy** | Full 3-section audit + adversarial CVE verify | Spawn sub-agents at maximum capacity if your platform supports it. Use your platform's most powerful mode and largest available context. | High |

**Agent Context (interactive):** score the scope with the tier rubric, then call `ask_question` once with the 3 tiers — mark the rubric's tier `✓`, show the score so the user sees why, localize labels, and wait for the user's choice before starting. `ask_question` = your platform's question tool: Claude Code `AskUserQuestion` · Cline `ask_question` · Roo `ask_followup_question` · Copilot `askQuestions` · Gemini CLI `ask_user` · Codex `request_user_input` · Cursor/Windsurf/Antigravity built-in prompts; none (e.g. Goose) → numbered text menu.

**Tier rubric (deterministic — same scope, same answer):** +1 for each that is true: ① >20 files or whole-repo/cross-module reach ② >2 of this skill's categories relevant ③ release / security / pre-ship context ④ findings will drive code changes (not a look-around) ⑤ this scope NOT already audited at ≥Standard in this session. **0–1 → Light · 2–3 → Standard · 4–5 → Heavy.** User's explicit tier request always overrides the rubric.

**Hook Context (non-interactive):** auto-select Light. No questions, no fixes, no sub-agents — report only.

**Heavy durability:** chunk long multi-agent runs into short phases, reading results between them; if a run dies mid-way, recover completed sub-agent results from your platform's run records and re-spawn only the missing pieces. On Claude Code, fan out with the bundled `coalmine-scanner` agent (one per category/module — read-only, compressed table output).
