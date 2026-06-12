# Changelog

All notable changes to CoalMine are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer (canonical version lives in `.claude-plugin/plugin.json`).

## [Unreleased]

## [2.7.0] — 2026-06-11

User-driven improvement loop, modeled on what makes living rule-sets (e.g. ECC) improve from real usage.

### Added
- **Feedback funnel**: GitHub issue forms — platform field report (per-agent works/breaks), bug report, and a security contact link routing through SECURITY.md. Templates only; no CI workflows.
- **`coalmine-scanner` bundled agent** (Claude Code auto-discovers `agents/`): read-only scan worker for Standard/Heavy fan-out — one dimension per spawn, compressed findings-table output, no prose. Shared footer points Heavy runs at it; `build-plugin.mjs` ships it and `verify.mjs` byte-checks it both directions.
- Work Execution Gate now ships the `task.md` format (`| # | Task | Detail | Tier |`, auto-create if absent) in all 4 trigger templates.

## [2.6.1] — 2026-06-11

### Fixed (security hardening, found by rotcanary QUICK on the fresh manifest code)
- Manifest skill names are sanitized to plain basenames before any `rm` (no separators, `.`/`..`, dotfiles, or absolute paths) — a corrupt or hand-edited `.coalmine-manifest.json` can no longer delete outside the install target or wipe the whole skills directory. Covered by an escape-attempt integration test (suite now 13).
- Installer integration tests get a 60 s spawn timeout so a hung installer can't hang the git gate.

## [2.6.0] — 2026-06-11

### Added
- **Install manifest** (`.coalmine-manifest.json`, written at every install target): the installer now works like a package manager — it records exactly what it installed, removes that set before installing the new version, and uninstall reads the same list. Skills renamed or removed in future versions can never leave orphan copies behind; skills from other vendors sharing the target directory are never touched. Covered by an integration test (fresh install → simulated rename → reinstall → uninstall) wired into the git gates (suite now 12 tests).

## [2.5.0] — 2026-06-11

### Added
- **Work Execution Gate** in all 4 auto-trigger templates with a deterministic significance test (>3 files, multi-step plan, or destructive action → offer Do now / Add to plan / View plan via the platform's question tool) — replaces per-session model judgment that made the gate fire inconsistently.
- Multi-language policy strengthened in the shared language header (all 9 skills): every runtime artifact — questions, answer options, menu labels, recommendations, report narrative — must be in the user's language; English is allowed only for technical terms (commands, paths, identifiers, severity and tier labels).

### Fixed
- PowerShell stop hook ported to the v2.4.0 acknowledgement semantics (`.scanned` stores the `.touched` timestamp; unknown/legacy content re-nudges) — Node/PS1 parity restored.
- README universal-installer steps no longer instruct `cd CoalMine` before installing (project targets resolve against the current directory — following the old steps installed skills into the clone itself); install steps now disclose the git-hook write + `.pre-coalmine` backup.
- Grammar/typo pass across docs, skill templates, and trigger templates; CHANGELOG 2.4.0 duplicate entries collapsed; SECURITY.md tag example bumped; Antigravity hook snippet now listed everywhere the snippet set is enumerated; Claude Code row distinguishes plugin cache from the installer path; installer usage header points Claude users to the plugin route.

## [2.4.0] — 2026-06-11

First release with changes authored by a second agent platform: Google Antigravity ran the rotcanary skill against this repo and submitted both PRs — live cross-platform validation of the canary suite.

### Added
- `--uninstall | -u` flag for `install.mjs` (PR #3): removes installed skills, strips the COALMINE trigger block (deletes the file if empty), removes CoalMine git hooks, and restores any `.pre-coalmine` backup.
- `SECURITY.md` — published SSH signing public key + `git verify-commit`/`tag -v` instructions, dist-integrity reproduction steps, and reporting channel.

### Fixed (PR #4 — 11 rotcanary findings, plus review follow-ups)
- Stop hook: language detection reads only the first 4 KB of project docs; `.scanned` marker stores the `.touched` mtime captured at nudge time, closing the same-mtime-tick acknowledgement race; review fix: legacy empty markers re-nudge instead of being silently swallowed.
- Touch hook: `path.normalize` on all recorded/compared paths (separator-variant dedup).
- Both hooks: trailing `process.exit(0)` removed — natural exit keeps exit code 0 AND guarantees the stdout JSON nudge is fully flushed; Phoenix #4 wording updated to match.
- `verify.mjs`: real frontmatter parsing (between `---` delimiters), `plugin/` root orphan check, try-wrapped directory reads; `install.mjs`: case-insensitive agent target, fail-loud `listSkills`, empty-file append without stray separator, backup detection via explicit `# Generated by CoalMine` marker.

### Added (trigger layer, pre-merge)
- All 4 auto-trigger templates (Antigravity/agents-group, Cursor, Cline, Copilot) upgraded from rotcanary-only to the full 9-canary keyword table + 6 proactive offer-conditions (deps→supply-chain, schema→drift, async→resilience, loops→scale, tests→testability, logging→telemetry) + session-end rule — ships the always-on layer both flagship platforms read.
- `platform-configs/hooks/antigravity-hooks.json` — rotcanary auto-cadence snippet for Google Antigravity (PostToolUse + stop-condition hooks; verify-in-install note).
- `hooks/settings.snippet.json` — Node hooks wiring for Claude Code installs WITHOUT the plugin route (parity with the existing PowerShell snippet).

## [2.3.0] — 2026-06-11

### Added
- Deterministic tier rubric in the shared escalation footer (all 9 skills): five concrete +1 signals (scope size/reach, category breadth, release/security context, will-drive-changes, not-recently-audited) map to Light 0–1 / Standard 2–3 / Heavy 4–5 — same scope always yields the same recommendation, the score is shown to the user, and an explicit user tier request overrides.

## [2.2.1] — 2026-06-11

DEEP rotcanary sweep over the whole repo (27 findings fixed).

### Fixed
- Cursor cadence snippet now actually works: the stop command wraps `rotcanary-stop.js` output into Cursor's `{followup_message}` (Cursor cannot consume Claude-style `decision:block`); docs no longer claim Copilot auto-wires — only the Claude Code plugin does.
- Git gate hardening: missing test files now fail the pre-commit/pre-push gate loudly (`node --test` silently ignores missing path args); disconnected `pre-commit.ps1`/`pre-push.ps1` removed (git never executes `.ps1` hooks and nothing installed them).
- `installGitHooks` backs up a pre-existing non-CoalMine hook to `<hook>.pre-coalmine` before overwriting, and `chmod`s after write (the `mode` option only applies on creation).
- `verify.mjs`: every per-item read is try-wrapped (one unreadable input now yields a clean `FAIL` line and the run continues); aux dist files (`references/`, `skill-meta.json`) are now byte-compared both directions against source.
- `installSkillDir` clears the target skill dir before copying so renamed/deleted source files can't linger at install targets; `inject()` uses function-form replacements so `$&`-style sequences in partials can't corrupt output.
- Hooks: `.touched` lines that aren't real paths are filtered from the nudge; multi-smell entries are one line per file (`'; '` join); files >1 MB skip the tripwire scan (latency budget); recording without a `session_id` no longer writes orphan `nosession` state; `.scanned` marker content is empty (only mtime was ever used). PowerShell pair kept in sync; its README now documents cleanup/sweep and the EN-only nudge difference.
- Docs truth: README's Ultra-Short format section now describes the real per-skill severity-table output; CHANGELOG 2.2.0 wording corrected (6 of 9 skills gained `references/`; footer −28% bytes); scale-canary "J-Join" typo; drift-canary Style-Drift rule scoped to Fix mode; cadence.md points to the shipped wiring snippets.

### Changed (token diet — every skill body slimmer, depth preserved)
- All 9 skill bodies slimmed for progressive disclosure; 6 of them (rotcanary, supply-chain, telemetry, testability, scale, drift) gained per-skill `references/*.md` holding the per-stack tables and platform matrices, loaded only when the skill actually runs a scan. Dist SKILL.md total 51.4 KB → 38.6 KB (−25%; rotcanary −36%) while adding depth.
- Removed per-skill "Contexts & Execution Modes" and "Before starting / Recommendation logic" boilerplate — the shared escalation footer now carries the gate once; tier intents live in the escalation table.
- Shared escalation footer compressed (−28% bytes, ~40% fewer lines) while keeping the per-platform `ask_question` alias map, hook-context rule, and Heavy-durability guidance.

### Added
- `references/checks.md` for telemetry, testability, scale, and drift canaries — concrete per-stack/per-ORM detection procedures (the four newest canaries now match rotcanary's audit depth).
- `references/tooling.md` (rotcanary, supply-chain-audit) and `references/cadence.md` (rotcanary) — moved from skill bodies.
- "Use when …" situational clause in the 5 keyword-only skill descriptions (telemetry/testability/scale/drift/resilience) for better auto-trigger accuracy on all platforms.
- Hook regression tests `scripts/lib/hooks.test.mjs` (5 cases: touch record, case-insensitive dedup, fail-silent, stop nudge, acknowledged-batch cleanup) — hermetic via sandboxed TEMP/USERPROFILE; wired into pre-commit/pre-push (now 11 tests total).
- `platform-configs/hooks/` — rotcanary auto-cadence wiring templates for GitHub Copilot, Cursor, Gemini CLI, and Codex CLI, from vendor-doc-verified event names.

## [2.1.0] — 2026-06-11

### Fixed
- `install.mjs` exits non-zero on partial failure (skill, config, or git-hook step) instead of reporting success.
- `installSkillDir` copies nested skill subdirectories (`references/`, `scripts/`) recursively instead of throwing `EISDIR`/`EPERM`.
- `verify.mjs` reports a clean per-skill `FAIL` on corrupt `skill-meta.json` instead of crashing with a raw stack trace.
- `upsertConfig` re-runs no longer duplicate template content outside the COALMINE markers (Cursor `.mdc` frontmatter grew on every install).
- rotcanary hooks now delete their session temp files once an edit batch is acknowledged, and sweep `rotcanary-*` files older than 7 days (Phoenix #1 zero garbage) — both Node and PowerShell variants.

### Added
- `verify.mjs` reverse check: orphan dirs in `plugin/skills/` with no source now fail the gate.
- Zero-dep unit tests for the render core (`scripts/lib/render.test.mjs`, `node --test`), including a stale-dist negative-path test; wired into pre-commit/pre-push hooks.
- `skills/_shared/README.md` documenting the SHARED marker and intent-placeholder conventions.
- Heavy Durability guidance in the shared escalation footer (all 9 skills): chunk long multi-agent runs into short phases; recover dead runs from the journal/transcripts instead of re-running everything.
- `CHANGELOG.md` (this file) and release tagging per the adopted release-bookkeeping rule.

### Fixed (cross-agent compatibility, source-grounded Jun 2026)
- Codex install target corrected to `.agents/skills/` (was `~/.codex/skills/`, which Codex never reads — per developers.openai.com/codex/skills.md; `agents/openai.yaml` is optional).
- Junie install target corrected to `.junie/skills/` (was `.agents/skills/`, which Junie does not read).
- rotcanary cadence claims now state per-platform truth: auto-wired on Claude Code (plugin) and GitHub Copilot (same hooks format); equivalent events on Cursor/Gemini CLI/Codex/Goose (manual wiring); manual-only on Cline/Junie. Kill-switch documented as Claude-specific.
- Shared escalation footer defines `ask_question` as an alias for each platform's real question tool (AskUserQuestion / ask_question / ask_followup_question / askQuestions / ask_user / request_user_input / suggested_responses) with text fallback where none exists (Goose); Heavy Durability wording made platform-neutral.
- README agent table: choice-tool column updated to verified reality (9 native, 3 text-fallback), Roo Code upstream-archived note, Agent Skills spec link.
- USE-WITH-ANY-AGENT.md rewritten with the verified per-agent path matrix; Letta removed (no documented skills support); fallback section now advises copying from `plugin/` (conformed) instead of `skills/` (templates).

### Changed
- `TARGETS` agent→path map hoisted to `scripts/lib/targets.mjs` — single source of truth for `install.mjs` and `verify.mjs`.
- `installGitHooks` installs `hooks/pre-commit.sh` / `pre-push.sh` verbatim so `.git/hooks` copies cannot drift from source.
- `rotcanary-stop.js`: `TRANSLATIONS` and `detectLang()` hoisted to module scope (`main()` back under the 50-line guideline).

## [2.0.0] — 2026-06-11

### Added
- 4 new canaries: `telemetry-canary`, `testability-canary`, `scale-canary`, `drift-canary` — suite now 9.
- Committed `plugin/` dist + `scripts/build-plugin.mjs` so the Claude Code marketplace route serves fully conformed skills (shared sections injected).
- `scripts/lib/render.mjs` render core shared by install/build/verify — all routes ship byte-identical content.
- `verify.mjs` gates: source must keep SHARED markers, dist must be byte-in-sync, marketplace must serve `./plugin`.

### Fixed
- YAML frontmatter in all 9 SKILL.md files converted to folded block scalars (`>-`) — strict parsers (`claude plugin validate`) now pass.

### Changed
- `marketplace.json` `plugins[0].source` moved from `./` to `./plugin`; manifests updated to 9 canaries.
- GitHub Actions/Dependabot generation removed from the installer — local-git-only alignment; templates remain in `platform-configs/`.

## [1.0.0] — 2026-06-09

### Added
- Initial CoalMine collection (5 quality meta-skills): `rotcanary`, `gold-standard`, `source-grounding`, `supply-chain-audit`, `resilience-audit`.
- Cross-platform rotcanary auto-cadence hooks (Node + PowerShell fallback).
- Universal installer/verify scripts (`scripts/install.mjs`, `scripts/verify.mjs`) for 12 agents.
