# Changelog

All notable changes to CoalMine are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer (canonical version lives in `.claude-plugin/plugin.json`).

## [Unreleased]

## [3.7.6] — 2026-06-19

Doc-accuracy pass: honest security-scan provenance, clearer config help, a named dead-code heuristic, and a churn-resilient per-platform escalation footer.

### Changed
- **SECURITY.md — honest scan provenance.** The NVIDIA SkillSpector section now PINS the last actual scan (v3.7.3, 2026-06-17) and states scanning is periodic, not per-release — instead of implying the bump "covers" later versions (an unscanned version's security is unverified). The maintainer comment carries the same rule: never bump the pin without a real re-scan.
- **`autoScanFileCapSlice` help clarified** — it is a file COUNT (the most-recently-modified files kept when `autoScanFileCap` is exceeded), not a fraction.
- **rot-canary "dead code" heuristic named** — *"Dead = zero-reference reachability across ALL entry routes (reflection, DI, events, public API, tests) — not a single-file grep."*
- **Escalation footer refreshed + churn-resilient.** Dropped the now-stale *"no concurrent fan-out: Gemini CLI · Cline · Windsurf"* claim — all three shipped parallel subagents through 2026 (Cline read-only · Gemini CLI · Windsurf→Devin) — and replaced the fixed list with a "verify your platform's current capability; these churn" note.

## [3.7.5] — 2026-06-18

Self-Updating — an opt-in, consent-gated update system, silent by default.

### Added
- **Self-Updating (two kinds), silent until due.** New config `updateMode` (`ask`|`auto`|`remind`|`off`, factory `ask`) + `updateCheckDays` (factory `14`). The conductor (SessionStart) stays silent until `updateCheckDays` elapse since the last check — a crash-safe stamp at `~/.claude/.coalmine-update-check`, throttled to once per window — then:
  - **kind 1 (plugin version):** `ask` prompts once how to handle updates (auto / remind / off, saved via `configure --update-mode`); `auto` has the agent compare the latest tag to the installed version and offer `claude plugin update` (standing consent — the only token-spending path, ~1–2K/check); `remind` is a free periodic reminder; `off` is silent. **The hook itself never networks or spends** — the version-check lives only in the new `/coalmine:update` agent procedure, gated on `auto`/explicit consent, with a graceful offline fallback.
  - **kind 2 (rule freshness):** a free, local SessionStart nudge when any gold-standard `coalmine: verified … revalidate Nd` stamp is past due — lifting `/coalmine:stats` past-due detection from pull-only to automatic. Consent-gated (the user runs `/gold-standard`).
- `/coalmine:update` command (the agent-side procedure) + hermetic conductor tests (13) + configure tests (2). 56 tests.

### Note
- `claude plugin update` does not auto-detect plugin staleness for community marketplaces (auto-update is opt-in per marketplace, off by default) — this fills that gap for users who keep auto-update off, without a fake offline version-check: the **agent** verifies, the **hook** only schedules.

## [3.7.4] — 2026-06-18

Ships the #12 config-loss fix to users: earlier post-3.7.3 commits kept the version at 3.7.3, so `claude plugin update` (which keys on the version) never delivered them.

### Fixed
- **`.coalmine.json` no longer silently reverts to defaults (#12).** The JSONC comment-stripper desynced on a string value ending in a backslash right before a later `//`: it leaked escape state, mis-stripped a later `//`-bearing string, `JSON.parse` threw, the `catch` swallowed it, and the whole config fell back to defaults — and a WRITE path in `configure.mjs` wiped user config the same way. The stripper is now one shared, string-aware `scripts/lib/jsonc.mjs` (consumes `\\.` or a non-quote/non-backslash char), used by the hook, `configure.mjs`, and `verify.mjs`, with `scripts/lib/jsonc.test.mjs`.
- **Thai text no longer leaks into two skills (#13).** `drift-canary` and `gold-standard` `SKILL.md` carried Thai parentheticals; removed. Skills stay English; runtime output still mirrors the user's language.
- **The installer sweeps a retired skill name even without a manifest.** A very old install (before the `rotcanary` -> `rot-canary` rename in v3.0.0, predating the install manifest) left the stale `rotcanary` skill dir behind on upgrade -- it was in neither the manifest nor the current set, so `cleanPreviousInstall` never reached it, and agents that read `.agents/skills` (e.g. Antigravity) kept listing a duplicate `/rotcanary` command. `cleanPreviousInstall` and uninstall now always sweep `RETIRED_SKILL_NAMES`.

### Changed
- **Docs.** Added `CONTRIBUTING.md`; trimmed README/SECURITY for word count and heading order; moved the `eval/` benchmark to the series umbrella; restored the "measurement" design principle. SECURITY.md's NVIDIA SkillSpector section now records an ACTUAL run (v2.2.3 via `uvx`, 2026-06-17, 58/100, 3 false positives) with full scan provenance, replacing the earlier "binary not executed" note.

## [3.7.3] — 2026-06-15

A CodeQL/security hardening pass, the series-doctrine move to the org, and a CI cleanup.

### Changed
- **The series doctrine moved to the org.** The Phoenix-13 (hooks-safety) and scripts-quality docs are now hosted canonically at [`TheColliery/.github`](https://github.com/TheColliery/.github) alongside DESIGN-PRINCIPLES, so the umbrella holds the whole constitution. CoalMine dropped its `docs/` copies; `SECURITY.md` links the Phoenix-13 doc at the org, and the doctrine-mirror gate now checks the two machine-local rule homes (a missing public copy was already tolerated).

### Fixed
- **CodeQL `security-and-quality` (`js/file-system-race`).** `install.mjs` (upsertConfig/uninstallConfig) and `configure.mjs` read-and-handle-ENOENT instead of existsSync-then-read/write; the `rot-canary-touch.js` tripwire does fstat+read on one file descriptor instead of statSync(path) then readFileSync(path) — still skipping large files before reading (Phoenix #3). All benign in context, but the read-and-handle idiom is cleaner. The remaining by-design findings are dismissed with documented reasons in the Security tab.
- **markdownlint MD060.** markdownlint-cli2-action v23 ships markdownlint v0.40.0 with the new MD060 table-column-style rule; disabled it (compact tables are valid GFM).
- **Detection benchmark dated.** The README states the eval run date (2026-06-13, skill v3.4.0) inline, not only behind a click-through to `eval/RESULTS.md`.

### Security
- **Workflow actions pinned to commit SHAs** (with a `# vX` comment), superseding the floating major tags; closes the OpenSSF Scorecard PinnedDependencies findings. Dependabot still tracks them.

## [3.7.2] — 2026-06-14

### Changed
- **The Design Principles (Quantum 11) moved up to the series level.** They are series doctrine — every tool in TheColliery obeys them — so the canonical copy now lives at the umbrella, [`TheColliery/.github/DESIGN-PRINCIPLES.md`](https://github.com/TheColliery/.github/blob/main/DESIGN-PRINCIPLES.md), generalized tool-agnostically. CoalMine's repo-local `DESIGN-PRINCIPLES.md` is removed and its README links the series doc.
- **The README now cross-links the series** (CoalMine ↔ CoalTipple). The link was one-directional before — CoalTipple pointed here, but not the reverse.

### Fixed
- **`rot-canary` fix-mode no longer assumes git.** The safe-fix checkpoint is now `git stash/commit in a git repo; else copy the file aside`, and the auto-revert restores whichever was used — a non-git user gets the same safe auto-revert. This enforces the new series rule **no external assumption**: no shipped feature HARD-requires git, GitHub, a network, or a CLI the user may not have (they are optional enhancements with a graceful fallback).

## [3.7.1] — 2026-06-14

### Added
- **Version-pin drift gate** (`scripts/lib/consistency.mjs` → `checkVersionPins`, wired into the verify gate): any doc line carrying a `version-pin:` marker (the issue-template version placeholders today) must quote the current `plugin.json` version, or `verify.mjs` fails — a stale hardcoded version can no longer ship (the "`git tag -v v2.4.0` example went stale" class, mechanized). The colon-marker form means a prose mention of the word `version-pin` is never treated as a pin; CHANGELOG history and the machine-local governance files are out of scope. Where a version can be dropped entirely it still should (e.g. SECURITY.md's verify example uses `git describe`); the gate covers the spots where a concrete version genuinely aids the reader. Gate suite now 34.

### Changed
- **Config-honesty pass — every documented `.coalmine.json` key now has a real consumer.** Seven keys that were defined and documented but never read are now wired into the canaries and the conductor: `defaultTier` (the shared escalation footer pre-sets the route tier — Light/Standard/Heavy — unless the user requests one for that run), `autoFixMode` (rot-canary treats it as standing consent: `off` = report only · `safe` = auto-apply reversible fixes, still checkpoint→build/test→revert if red · `interactive` = show the menu), `schemaPaths` / `migrationDirs` (drift-canary scans those globs/dirs), `packageManifests` (supply-chain-audit scans exactly those manifests), `trustedDomains` (source-grounding treats them as additional authoritative sources), and `skipOnboarding` (the conductor drops only the gold-standard onboarding line). Mirrors CoalTipple's config-honesty discipline; adds a conductor `skipOnboarding` test (gate suite now 35).

### Removed
- **Tombstoned the `skillUpdateCheckDays` config key** (`scripts/lib/config-schema.mjs`, both `.coalmine.json` factory files): no consumer, and offline skill-staleness is not something a fail-silent hook can verify — the marketplace/host owns update checks. Do not re-add without a real consumer.

### Security
- **SkillSpector scan refreshed to v2.1.4** (`SECURITY.md`): the static pass scores 58/100 (HIGH) and raises 3 findings, each re-reviewed and confirmed a false positive (an HTML-comment freshness stamp, the consent-gate line itself, a session-scoped temp file). The LLM semantic pass that would contextualize them does not complete on the available API tier (v2.1.3 hit HTTP 429, the v2.1.4 run timed out), so the headline falls back to the pessimistic static number. The real assurance remains structural (Phoenix-13).

## [3.7.0] — 2026-06-13

### Added
- **`install.mjs all` — auto-detect, install to every agent in the repo** (`scripts/install.mjs`, `scripts/lib/targets.mjs` → `detectPresentAgents`): one command installs CoalMine to each agent already configured in the current project — detected by its marker dir (`.cursor/`, `.agents/`, `.github/`, `.gemini/`, `.junie/`) — and skips the rest, printing what it detected vs skipped (fail-loud, never a silent no-op). Claude Code and Cline (both rooted at `.claude/`) are excluded from auto-detect so it can never double a plugin install; install those by name. This is the low-risk form of "install everywhere": it keeps every source-grounded vendor path (no silent coverage drop) while covering the convergent majority in one shot — unknown or brand-new agents route to platform-report, not a path map that quietly rots. Adds a `detectPresentAgents` unit test and an `all` integration test (gate suite now 33).
- **Agent-count drift gate** (`scripts/lib/consistency.mjs` → `checkAgentCount`, wired into the verify gate): the README agent-table row count must equal the number of targets in `scripts/lib/targets.mjs`, or `verify.mjs` fails. The supported-agent count now lives in exactly one place — the table == `targets.mjs`; every other surface (badges, About, prose, org profile) is number-free "major agents", so a stale count can no longer ship. Skips gracefully when no README is present (partial copies).

## [3.6.0] — 2026-06-13

### Removed
- **Dropped the Roo Code target** — Roo Code's upstream repo was archived 2026-05-15 (the team pivoted to Roomote, stating IDEs aren't the future of coding). Dead vendor → drop support. Removed from `scripts/lib/targets.mjs`, `scripts/install.mjs`, the README agent table, and the platform-report issue template. Existing Roo forks can still copy a conformed `SKILL.md` manually. Supported targets: 12 → 11.

### Fixed
- **Corrected the Cline skills path** (`scripts/lib/targets.mjs`, README): was `.agents/skills`, but Cline does **not** read `.agents/` — it reads `.cline/skills`, `.clinerules/skills`, and `.claude/skills`. Now targets `.claude/skills` (the cross-agent path Cline honors). Source: docs.cline.bot. Re-source-grounded all agent skill-paths against agentskills.io (Jun 2026).

### Changed
- **Platform-aware Escalation Tiers** (`skills/_shared/orchestration.md`): tiers are now explicit **capability targets** with a **degrade-gracefully rule** — platforms without concurrent-worker fan-out (Gemini CLI, Cline, Windsurf in-session) stay single-agent and escalate via model + reasoning only, never faking parallelism — plus a per-platform Heavy-lever map (Claude Code Dynamic Workflows/`ultracode`, Codex `xhigh`+Cloud, Cursor Max Mode+Cloud Agents, Antigravity Agent Manager, Amp Oracle, etc.). Map deliberately keys on stable mode names, not volatile model IDs.

## [3.5.1] — 2026-06-13

### Fixed (security — caught by rot-canary auto-scan on the v3.5.0 code, same day)
- **Manifest integrity path-traversal guard bypass on Windows** (`lib/manifest.mjs`): the guard split keys on `/` only, so a hand-crafted manifest key using Windows backslashes (`..\..\evil`) slipped past and `verify.mjs <target>` would resolve and hash a file outside the install target (read-only info-disclosure oracle). Replaced the segment scan with a resolve-and-contain check (`path.resolve` + `path.relative`), which handles `/`, `\`, absolute, and drive-relative keys uniformly. Escape-attempt test now covers both separators. Same path-traversal class as the v2.6.1 `safeSkillNames` fix — surfaced again the moment fresh security code shipped.

## [3.5.0] — 2026-06-13

### Added (principle 10 — distrust your own non-code artifacts; "Windows-grade" hardening)
- **Self-consistency layer** (`scripts/consistency.mjs` + `lib/consistency.mjs`): mechanical cross-checks on the artifacts an agent trusts but never verifies — canary-count agreement (`skills/` vs `plugin.json`), **byte-identical doctrine mirrors** across `docs/` and every rule home (a diverged copy is the fingerprint of a stale sync or a tampered rule), and well-formed stamps. Tracked-file checks run in the verify gate; the full check (incl. machine-local rule home) is on-demand.
- **SFC-lite installed-artifact integrity** (`lib/manifest.mjs`): the installer records a SHA-256 of every file it writes; `node scripts/verify.mjs <target>` re-hashes the installed tree and flags any file changed after install (tamper) or missing — a surface git never sees. Path-traversal-guarded.
- **Memory/rule poison detection** in the gold-standard RE-VALIDATE pass: now flags a memory/decision-log or rule-register entry that contradicts a binding rule or another decision, or names a file/flag/command that no longer exists — the class proved live when a planted "fix" re-prescribed a Phoenix-#8-forbidden randomized sweep.
- DESIGN-PRINCIPLES #10 extended: the machine verifies what it *trusts* (installed copies, doctrine mirrors, memory), not only what it *ships*.
- Gate suite 25 → 30 tests.

### Added (cross-model convergence runs)
- **Second eval engine**: Antigravity ran the rot-canary corpus blind — recall 13/13, 0 decoy false-positives, severity 12/13; the sole disagreement (one CRITICAL rated HIGH) sits exactly in the predicted severity-judgment band. README and eval/RESULTS.md now show the two-engine table.
- hooks-safety doctrine gains **section 7 — Hermetic Hook Testing** (spawn the real hook, sandboxed env, assert exit/silence/state) — proposed by an independent Antigravity RE-VALIDATE whose verdicts and exemplars matched the existing stamps 2/2 (the lifecycle's anti-churn + exemplar-anchor mechanics held across models); published copy in docs/.

### Fixed
- configure.mjs: a trailing boolean flag with no value now errors instead of silently writing false (same fail-loud contract as the strArr fix); eval scorer drops a confusing no-op exit line.

### Added
- **Eval harness** (`eval/`) — AV-Comparatives-style detection-rate measurement: 16 rot-canary fixtures (12 with planted, line-labeled defects across all 7 categories + 4 clean decoys), a mechanical scorer (`eval/score.mjs`, match = fixture+file+category, line ±3), and model-stamped results. Baseline (claude-fable-5, self-run regression floor): recall 13/13, 0 decoy false-positives. README gains a "Measured detection quality" section.
- `docs/` — the Phoenix Commandments (hooks-safety) and scripts-quality doctrine are now published in-repo; DESIGN-PRINCIPLES.md previously linked them at `.claude/rules/...`, a gitignored path nobody on GitHub could open (caught by the user). Repo-wide link audit found no other broken links.

## [3.4.0] — 2026-06-12

### Changed (principle 4 — minimum necessary power: the fat-trim release)
- **Conductor injection −37%** (1930 → 1218 chars) — same rules, fewer tokens in every session's context; the per-key list is replaced by a pointer to the commented config file.
- **Stop-nudge tail trimmed ~40% in all 5 languages** — the tail duplicated what the invoked skill already instructs; now just: confirmed-only report, offer the fix menu, kill-switch path.
- **Shared regions for standalone hooks**: the duplicated config plumbing (findGitRoot/loadCfg + PowerShell twins) lives once in hooks/_shared/ and is synced into all 5 hook files between coalmine-shared markers by build-plugin — single source, each hook still copy-one-file portable (Phoenix #9); verify FAILs on drift. The conductor now uses the same cached loader.
- **Table-driven config tooling**: the 22-key schema moved to scripts/lib/config-schema.mjs, shared by verify.mjs (a validation loop replaces 23 hand-written if-blocks) and configure.mjs (flags, parsing, validation, and --help generate from the table) — the "help forgot a flag" bug class can no longer ship; a gate test asserts help documents every key.
- Escalation heading + table header deduplicated into the ORCHESTRATION partial (9 SKILL.md sources; rendered output unchanged).
- Gate suite 22 → 25 tests (shared-region sync/drift, configurator help completeness).

## [3.3.0] — 2026-06-12

### Added (principle 9 — calibration: the config release, PR #7)
- **Categorized .coalmine.json config system**: 22-key schema in 4 commented groups (interactive behavior, scan & watch limits, re-validation cadences, enterprise paths). The installer drops a fully documented copy at the project root — zero-config defaults for everyone, overrides for programmers. scripts/configure.mjs edits it with validation + legacy-key migration; verify.mjs type-checks every key; hooks read it dynamically.
- Hooks resolve .coalmine.json from the **git root**, not the cwd — config honored when the agent works from a subdirectory (issue #5 C2). Installer supports worktree/submodule .git files via gitdir: resolution (C5) and refuses to target CoalMine's own skills/ source (C1).
- Auto-scan token cap: more than autoScanFileCap touched files → newest autoScanFileCapSlice scanned, localized notice appended (all 5 languages).

### Fixed (issue #5 + Fable-5 review of the PR)
- Touched files recorded as **absolute paths** in Node + PowerShell touch hooks — subdirectory edits no longer vanish from the stop-hook scan (C4).
- **Temp sweep made deterministic** (C3 + Phoenix #8): the shipped Math.random() throttle is replaced by a 24h marker-file gate in Node + PowerShell; tempSweepProbability retired (configurator migrates it away); PowerShell sweep now also clears legacy rotcanary-* files.
- **Legacy v3.0.0 config keys honored again**: disable/mode/conductor work alongside the new names in all five hooks; README schema table now documents the canonical keys it contradicted.
- **Hook stdin BOM-hardened** — some shells prepend a BOM when piping; JSON parsing now survives it (S1, found when the test probe itself hit it).
- Config read once per hook invocation (was 4–5 reads with git-root walks each); dead CODE_EXT set removed; hooks.test.mjs had raw NUL+SOH bytes that made git treat it as binary — escaped, the file diffs as text again.
- Skill docs conform to the canonical mold (Fix mode before Output, one heading name — S2); /coalmine:stats restores the claude plugin update advice; gate suite 20 → 22 tests (configurator covered).

## [3.2.1] — 2026-06-12

### Fixed
- Tier rubric freshness cap: when the scope was already audited >=Standard this session (criterion 5 = 0), the recommendation is now capped at Light regardless of total score — previously size criteria alone could recommend Heavy for freshly-audited ground, contradicting the rubric's own caveat. Caught live during first dogfood of the plugin-served skill.

## [3.2.0] — 2026-06-12

### Added
- **Self error-report (offer-gated)**: when a CoalMine component itself misbehaves, the agent OFFERS to file it at github.com/HetCreep/CoalMine/issues with a user-reviewed summary — never auto-submitted, never includes unapproved code/paths, zero tokens to send (browser form). Wired in the conductor and the shared footer (all 9 skills, all platforms).
- skills.sh one-line install (npx skills add HetCreep/CoalMine) in README; GitHub repo topics set for discovery.

## [3.1.1] — 2026-06-12

### Added (principle 4 of the antivirus model — definition freshness)
- Every references/*.md now carries a coalmine: verified stamp (30d for the platform-coupled cadence file, 90d for pattern tables) — the shipped pattern DB ages visibly, like antivirus definitions.
- /coalmine:stats section 3: definitions-freshness dashboard. Overdue definitions advise updating CoalMine itself (plugin update / fresh install) — never a local re-ground of shipped files.

## [3.1.0] — 2026-06-12

The power-button release: install is the only command a user must know.

### Added
- **Conductor hook** (SessionStart, plugin route): injects the offer rules into every Claude Code session — gold-standard onboarding (offered once when a project has no golden rules), specialist offers by conversation domain, consent and per-project-config rules. Silenceable via .coalmine.json (conductor:false). The plugin route now carries the full always-on layer that previously existed only in installer trigger templates.
- **gold-standard onboarding offer** in all 4 trigger templates (installer route) — same first-encounter rule.
- README: One button - the suite drives itself (who fires when, and where consent lives).

## [3.0.1] — 2026-06-12

### Fixed
- Hook-nudged auto-scans now end by OFFERING the fix menu when a user is present (all 5 nudge languages, Node + PowerShell, skill body, shared footer) — previously the report-only rule written for unattended contexts suppressed the menu in interactive sessions, so findings arrived with no next step. Fixing still requires a chosen option; truly non-interactive runs stay report-only.

## [3.0.0] — 2026-06-12

**The Quantum Computer Spec is complete — all 11 design principles implemented.**

### Changed (principle 3 — single brand; BREAKING, softened by aliases)
- **`rotcanary` renamed to `rot-canary`** everywhere — skill dir, frontmatter, triggers, hook filenames (`rot-canary-touch.js`/`rot-canary-stop.js`), temp-file prefix, config files, docs, templates, snippets. Migration is automatic: the install manifest removes the old skill dir, the plugin cache swaps wholesale, legacy triggers (`/rotcanary`) stay as documented aliases, legacy config names (`~/.claude/.rotcanary-off`/`-mode`) are still honored, and the temp sweep cleans legacy-prefix files.
- Canonical SKILL.md structure ("the mold") documented in `skills/_shared/README.md`; every skill now ships a `references/` dir (9/9 — gold-standard `method.md`, source-grounding `sources.md`, resilience-audit `checks.md` added).

### Added (principle 9 — measurement & calibration)
- **Rule lifecycle** in gold-standard: FILL stamps every rule (`verified · exemplar · revalidate 30|90d`); repeat AUDIT re-validates stamped rules (re-stamp / rewrite / RETIRE with a tombstone that blocks resurrection); trigger templates offer `/gold-standard` when a stamp is past due. Cadence grounded against live sources (Jun 2026): platform surfaces ship weekly-to-daily → 30d backstop; OWASP/NIST anchors are annual+ → 90d is strict early warning; CVE rules re-validate on advisory events first.
- **`.coalmine.json`** per-project calibration — `disable` (canary list) and `mode` honored by both hook implementations; `defaultTier`/`language` honored by skills via the trigger templates.
- **`/coalmine:stats`** bundled command — canary activity this session + rule-freshness dashboard with an overdue re-validation offer.

### Added (principle 11 — entanglement)
- Shared footer hand-off map: after any report, findings in another canary's domain trigger a one-line offer of that canary (perf→scale, contract→drift, failure-path→resilience, logging→telemetry, coupling→testability, deps→supply-chain, unverified claims→source-grounding, rule gaps→gold-standard).

### Infrastructure
- `build-plugin.mjs`/`verify.mjs` generalized to ship and byte-check bundled extras (`agents/`, `commands/`) both directions; suite now 14 tests (project-disable test added).

## [2.8.0] — 2026-06-11

The Quantum Computer Spec release — part 1 of 3 (principles 4 & 5; naming uniformity and measurement/entanglement follow).

### Added
- `DESIGN-PRINCIPLES.md` — the 11 binding principles (5 machine properties, 5 sustaining disciplines, 1 power source) every component is judged against; links the Phoenix Commandments and scripts-quality layers under one spec.

### Removed (principle 5 — only essential accessories)
- `skills/_shared/contexts.md` — orphan partial never injected by any template; its content (Work Gate, proactive offers) ships in the trigger templates. Render core no longer knows a CONTEXTS marker.
- `USE-WITH-ANY-AGENT.md` — merged into README (portability table, conformed-copy fallback warning, frontmatter quirks, also-reads notes); one installation document instead of two.

### Changed (principle 4 — minimum necessary power)
- Shared block (language header + escalation footer) editorially tightened — same semantics, fewer tokens on every skill load; suite-wide dist bodies −8% on top of the v2.2.0 diet (43.8 KB total).

## [2.7.1] — 2026-06-11

### Fixed
- `build-plugin.mjs` copies `agents/` recursively (`cpSync`) — the flat `copyFileSync` loop would EISDIR on any future subdirectory, the same defect class fixed in `installSkillDir` at v2.1.0.
- `verify.mjs` checks the bundled agents both directions: a `plugin/agents/` left behind after the source `agents/` is removed now fails the gate instead of shipping silently.

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
