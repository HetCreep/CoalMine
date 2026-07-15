# Changelog

All notable changes to CoalMine are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer (canonical version lives in `.claude-plugin/plugin.json`).

## [3.11.1] - 2026-07-15

**PATCH** — security hardening follow-up to v3.11.0: closes the dir-symlink residual on the AG conductor's tmp marker.

### Security
- **Marker subdir hardened against a pre-planted symlink** (`hooks/coalmine-conductor.js`): `mkdirSync(recursive)` silently follows a symlink pre-planted at the marker subdir (the `0o700` mode is not applied to a pre-existing dir), so the `wx` marker could write through it into an attacker-controlled location. An `lstatSync` no-follow check now rejects a symlink subdir and fail-closes (skips the emit) — one-flock with CoalHearth v1.3.2 and CoalFace v0.3.2. Completes the CodeQL `js/insecure-temporary-file` mitigation the v3.11.0 wx-latch began. Tests 39/39.

## [3.11.0] - 2026-07-15

**MINOR** — five more platforms gain hook-configs (GitHub Copilot CLI, Kiro, Augment, Devin CLI, JetBrains Junie), Gemini CLI reaches full SessionStart-driven auto-cadence, and file-copy installs get an honest `FileCopy` conductor mode.

### Added
- **Five new platform hook-configs** (`platform-configs/hooks/`): GitHub Copilot CLI (camelCase events, `{"version":1}` format, bash+PowerShell command pairs) · Kiro (merge-snippet into `.kiro/agents/{name}.json`, `agentSpawn`/`postToolUse`/`stop`) · Augment (settings.json cascade, PascalCase) · Devin CLI (`.devin/hooks.v1.json`, CC-shaped — explicitly Devin-CLI-only; Devin Desktop/Cascade is a separate system, documented as such) · JetBrains Junie (SessionStart-only, user-scope config; conductor-nudge tier only — no per-tool events exist there). All five carry the badge-tier works-with label; response channels are honestly marked where unverified.
- **`FileCopy` conductor mode**: a file-copy install (the five platforms above) gets KIND-2 rule-freshness only — the KIND-1 `claude plugin update` offer and the shared update-check stamp are excluded, both being CC-plugin machinery; this also stops a file-copy platform from consuming the update stamp a co-installed Claude Code's own nudge depends on.
- **`kiro` and `augment` install targets** in `scripts/lib/targets.mjs`.
- **Gemini CLI reaches full auto-cadence**: the conductor now wires through Gemini's genuine `SessionStart` event, emitting the dedicated nested `{"hookSpecificOutput":{"additionalContext"}}` shape — Gemini's only SessionStart injection channel (the flat `additionalContext` shape used elsewhere would be silently dropped). `geminiMain` honors a payload-supplied `cwd` (mirrors `agMain`). Wiring is labeled wired-not-validated.

### Fixed
- **Gemini CLI docs reconciled across 5 spots**: retires the stale "superseded by Antigravity CLI" framing — Gemini CLI is a business-tier product with an 11-event official hook surface; only the individual tiers ended (2026-06-18).
- **AG once-per-session marker hardened against a TOCTOU race** (`hooks/coalmine-conductor.js`): the conductor's marker is now an atomic `wx`-flag create in a private `0o700` `os.tmpdir()/coalmine/` subdir, replacing the old check-then-write — one-flock with the same-day fix in CoalHearth v1.3.1 and CoalFace v0.3.1.
- **Stale-marker sweep gained a second pass for the new subdir** (the legacy flat-root pass stays, for pre-fix installs) and now runs BEFORE the rot-canary mode gates: conductor markers are collected on every stop even when rot-canary is off/manual. Ownership split — the canary's own temp stays mode-gated.

### Security
- Closes the four 2026-07-14 CodeQL HIGHs (`js/insecure-temporary-file` ×2 + `js/file-system-race` ×2) at source; the shipped `plugin/` dist pair closes with this release's rebuild.

### Notes
- **Supersedes [3.7.9]'s "sweep runs only on the active path" note.** True when written — the sweep only ever touched the canary's own temp. The AG port later added conductor markers (a separate advisory-payload class), so the sweep now runs on every stop to collect those too, even when rot-canary itself is off/manual; the canary's own temp stays mode-gated exactly as 3.7.9 described.

Gate: build + verify + `hooks.test.mjs` 38/38 + `conductor-update.test.mjs`/`consistency.test.mjs` 30/30 PASS.

## [3.10.0] - 2026-07-14

**MINOR** — the full auto-cadence (conductor + rot-canary) runs on Antigravity 2.0's real hook engine (`hooks.json`; empirical pilot 2026-07-12 — which fired CoalMine's Stop cadence live on AG — corroborated against the official docs 2026-07-13). Honest scope: the Stop-hook FIRE is pilot-proven on AG; delivery of the injected context into the agent is emitted per spec, NOT yet validated end-to-end — the README tier is **wired**, not validated, until a real AG session confirms it.

### Added
- **The 3 Node hooks are dual-mode via an event-name argument** (the AG template runs `node <hook> <Event>`; Claude Code invokes with no argument — zero CC behavior change): the conductor rides the FIRST `PreInvocation` of a session (AG never fires `SessionStart`), guarded once-per-session by a tmp marker written BEFORE the emit (write-fail → no emit — an unguarded injection would repeat per MODEL call); the markers are swept by rot-canary-stop's stale sweep (a named Node-vs-PowerShell divergence). The stop hook emits `{"additionalContext"}` on AG (never `decision: block`); the touch hook reads AG payload shapes defensively (`tool_input`/`toolInput`/`toolCall.args` + path-key variants, resolved against the payload cwd — an unmapped shape is a no-op, never a wrong record).
- **KIND 1 self-update is deliberately NOT injected on AG** (`claude plugin update`/`configure.mjs` are CC plugin machinery, and an AG-side check would consume the CC throttle stamp — the CoalHearth precedent); the KIND 2 rule-freshness nudge rides along.
- `platform-configs/hooks/antigravity-hooks.json` rewritten to the verified AG spec (named-group wrapper, external-script commands, flat simple events / nested PostToolUse matcher, both install locations); the `platform-configs/hooks/README.md` Antigravity row updated to match.
- The session-id allowlist (`[A-Za-z0-9_-]+`) is unchanged for AG — the AG sid format is undocumented, so it stays fail-closed (a non-matching sid = a safe no-op; the 2026-07-12 pilot's live fire proves real AG sids pass).
- +6 hermetic AG spawn tests → 92 total.

### Fixed
- `skills/rot-canary/references/cadence.md` carried a stale pre-2.0 Antigravity line ("`PostToolUse`/stop-condition hooks") — now states the real AG story: the `hooks.json` engine, `PreInvocation` (once-per-session conductor guard) / `PostToolUse` / `Stop`, and the dual-mode event-name argument.

## [3.9.3] - 2026-07-09

**PATCH** — board-audit fixes (the user's CoalBoard nasa audit, 2026-07-09): a real consent-escalation gap the v3.9.1 "monotonic config = FP" verdict wrongly cleared, plus a same-class config-floor miss and a conductor/doc drift gate.

### Fixed
- **[HIGH] `updateMode` now safer-value-wins across the two-level config cascade — the v3.9.1 "FP" verdict was wrong to clear this key.** A project `<gitroot>/.coalmine.json` could set `updateMode: "auto"` while the user's global `~/.claude/.coalmine.json` said `"off"`; because the v3.9.0 cascade lets the project win per key with no exception, `hooks/coalmine-conductor.js` would then follow the project's `auto` directive and instruct the agent, on every SessionStart, to web-check the latest tag and offer `claude plugin update` — a standing-consent, network-touching action the user never approved at the global level, contradicting PRIVACY.md's "nothing expensive runs silently" framing. `updateMode` is not like `autoFixMode` (the one auto-EDIT key, read by the AGENT straight from the raw project file, never through the hook merge — the FP verdict was correct there): `updateMode` **is** hook-read via `loadCfg()` and drives hook behavior directly, so a project override there genuinely can weaken a global safety choice. Fixed with a safer-value-wins guard scoped to this one key: when **both** layers explicitly set `updateMode`, the project may only quieten it (move toward `off`), never loosen it toward `auto`; when either layer is silent, the other's explicit value applies unchanged (no forced escalation of an unset default). The doctrine comment ("NO safer-value-wins guard ... BY DESIGN") is corrected in both `hooks/_shared/node-config.js` (the live consumer — the conductor is Node-only) and `hooks/_shared/ps-config.ps1` (rationale parity; no PowerShell hook reads `updateMode` today, but the shared comment must not keep asserting the now-disproven blanket claim).
- **[LOW] `tempSweepStaleDays` floor raised from `0` to `1`.** The v3.8.4 clamp (`Math.max(0, Math.floor(...))`, schema `min: 0`) treated an explicit `0` as valid, but `0` collapses `rot-canary-stop.js`'s sweep cutoff to exactly `Date.now()` at read time — by the time `sweepStale()`'s loop runs, every temp file's `mtime` (including the current session's own just-written `.touched`/`.scanned`/`.smells` markers) already sits in the past relative to that cutoff, so every `rot-canary-*` temp is deleted, including the live session's own. Same self-inflicted, own-`os.tmpdir()`-only, fail-silent blast radius as the v3.8.4 fix, one value further down the same class. Floor raised to `1` in `config-schema.mjs` (`min: 1`) and both clamp sites — `hooks/rot-canary-stop.js` (Node) and `alt/powershell/rot-canary-stop.ps1` (PS twin) — `Math.max(1, Math.floor(n))`; NaN/non-finite still falls back to the factory default (7).
- **[MED] consistency.mjs now gates the conductor's own "9 quality canaries" string, not just `plugin.json`'s.** `checkCanaryCount` already cross-checked `plugin.json`'s `"<N> quality-canary"` description against the real `skills/` count, but `hooks/coalmine-conductor.js`'s hardcoded `CONDUCTOR_HEAD` line — "`[CoalMine] 9 quality canaries installed`", which fires on every SessionStart — had no gate at all. A canary added or removed with `plugin.json` updated but this string missed would ship silently wrong in the one place a user reads it every session. Closes the "About sat at 5 canaries for four versions" class of bug at its most-read surface.
- **The three `/coalmine:stats`-only freshness keys get an honest consumer note.** `platformRuleRevalidateDays`, `definitionRevalidateDays`, and `platformDefinitionRevalidateDays` are fully validated and CLI-settable (`config-schema.mjs`) and drive `/coalmine:stats`' on-demand freshness tables — but the SessionStart auto-nudge (`hooks/coalmine-conductor.js` `countPastDueStamps`) has never read them: it takes each stamp's OWN literal `revalidate Nd` as the past-due threshold directly, and reads `ruleRevalidateDays` only as a fallback for a malformed stamp that carries no parseable `Nd`. So a `revalidate 30d` (platform) or `revalidate 90d` (general) stamp is honored straight from the stamp text, and the three platform/definition keys never enter the SessionStart calculation at all. (`/coalmine:stats` differs — it maps a stamp's `Nd` to a config key, `30d → platformRuleRevalidateDays` / `90d → ruleRevalidateDays`, and applies that key's value, so the nudge and stats agree only while the keys sit at their factory 30/90 defaults.) A reader of the parallel-sounding `help` text could reasonably assume all four keys govern the same nudge. Documented the split explicitly rather than wiring the auto-nudge to the platform-specific keys too — `/coalmine:stats` already does the fine-grained key-customizable distinction on-demand; duplicating it into the hot SessionStart hook, where each stamp's own `Nd` is already an adequate threshold, would be scope the finding never asked for.

### Notes
- **Correction to the [3.9.1] "Notes" verdict.** That entry generalized a true, narrow observation about `autoFixMode` ("read by the AGENT from the raw file, not by any hook via the merge") into a blanket claim that *no* hook-read config key needs a safer-value-wins guard. Half-wrong, not fully wrong: right for the key it actually traced, wrong to extend the conclusion to `updateMode`, which the merge feeds straight into a networked, consent-bearing hook decision. Credit to the user's CoalBoard nasa audit for catching the over-generalization. **Lesson: a false-positive verdict is scoped to the key it verified — it does not transfer to a sibling key just because both pass through the same merge.** Each config key needs its own consumer trace, not a verdict borrowed from its neighbor.

## [3.9.2] - 2026-07-09

### Removed
- **`AGENTS.md` Rule 5 ("Work Execution Gate + Haldane Safety Protocol") destroyed outright, and its "Work Execution Gate" paragraph removed from all 4 shipped platform templates** — `platform-configs/clinerules.template`, `copilot-instructions.template`, `cursor.mdc.template`, `windsurf.md.template`. This was a dev-machine personal workflow (a 3-option Do-now/Add-to-plan/View-plan task gate, plus an in-flight-file spawn-safety protocol) that had leaked into shipped surfaces — never a CoalMine skill feature. Each template's canary proactive-offer paragraph (Run now / Queue / Skip for the 9 canaries) is kept — that is the skill's actual function, not the gate. The concern is owned by shipped skills instead: CoalFace's fan-out/in-flight discipline, and each conductor's consent-gated offers. v3.9.1 (earlier today) removed only the README's public-facing claim about this gate and kept Rule 5 as this repo's own local governance; the user then ordered full destruction, reversing that call — this release completes it. `AGENTS.md` (machine-local, gitignored, never shipped) is tombstoned the same day.

## [3.9.1] - 2026-07-09

### Removed
- **README §"Work Execution Gate & Haldane Safety" — a false plugin-feature claim.** The public README advertised a Work Execution Gate + Haldane Safety Protocol as if the installed plugin performs them, but they are defined ONLY in the gitignored `AGENTS.md` (Rule 5 — this repo's local dev-governance / cross-agent instruction templates); the shipped `plugin/` has no code for them, so an installing user never got them. Removed from the README; Rule 5 stays as this repo's own governance. (Board-2 dogfood finding; the "false claim worse than none" class, same as the CoalFace wallet fix.)

### Fixed
- **Config read-time clamps on three raw numeric keys** — `ruleRevalidateDays` (conductor), `tripwireMaxFileSizeKb` + `tripwireMaxLines` (touch hook) were read raw; a negative / 0 / NaN value in a project `.coalmine.json` broke the gate (mass false past-due nagging / a silently-disabled smell tripwire). Now floored to a positive integer (`Number.isFinite` + `Math.max(1, Math.floor(...))`), matching the `tempSweepStaleDays` / `autoScanFileCap` clamps already in place. +1 hermetic regression (80 node tests).

### Notes
- Board-2 also flagged a "monotonic config" gap (a project override weakening a global safety choice, à la CoalWash's `mergeSafety`). On verification this is a FALSE POSITIVE for CoalMine and was NOT shipped: every hook-read config key is Phoenix-13 side-effect-free (report / nudge / scan — nothing deleted or auto-edited), and the one auto-EDIT key (`autoFixMode`) is read by the AGENT from the raw file, not by any hook via the merge — so a hook-side safer-value-wins guard would protect nothing. The finding pattern-matched CoalWash's memory-DELETE trust-boundary onto CoalMine's side-effect-free hooks. Rationale recorded in `hooks/_shared/node-config.js`.

## [3.9.0] - 2026-07-09

**MINOR** — the two-level config cascade lands (one-flock key-parity with the 4 siblings; closes the dead-global-config finding the CoalFace sweep's QC surfaced: the user's tuned `~/.claude/.coalmine.json` was never read by any hook).

### Added
- **Global config layer:** every hook now reads `~/.claude/.coalmine.json` and overlays it per key with the project `<gitroot>/.coalmine.json` (project wins) — the same two-level cascade every sibling ships. Either file alone works; keys named `__proto__`/`constructor`/`prototype` are dropped at merge (an untrusted project config must not pollute the prototype). Shipped in the shared config partial, so all three Node hooks AND both PowerShell twins gain it in one place (Node≡PS parity).
- **`configure.mjs --global`:** targets the global layer (`~/.claude/.coalmine.json`, directory created if missing) instead of the project git-root file. Help + example added.
- Hermetic regressions: global-only honored · project-wins-per-key · proto-key dropped at merge (Node), global-honored + project-wins (PS twins), `--global` writes home-not-project (configure).

### Changed
- README Configure intro: from "there is no global layer" (true until this release) to the two-level cascade with the `--global` writer named.

## [3.8.5] - 2026-07-09

**PATCH** — platform-landscape refresh + a Configure-intro truth fix (part of the flock doc-conform sweep, CoalFace-orchestrated).

### Changed
- **Platform refs refreshed (July 2026 landscape):** Windsurf → "Devin Desktop (ex-Windsurf)" (rebrand, Jun 2; mechanics/paths/CLI tokens kept verbatim); Gemini CLI mentions annotated "(superseded by Antigravity CLI, Jun 2026)" — kept, never removed (legacy installs remain real). Touches the shared escalation footer (renders into all 9 skills), the escalation reference, the rot-canary cadence reference, the README works-with badge + agent table, and the platform-configs hook snippets.
- **Configure intro now tells CoalMine's TRUE config model:** a single per-project `.coalmine.json` read from the git root — there is NO global layer (every hook reads `<gitroot>/.coalmine.json` only; verified in code) — with the per-project off-switch named (`enableConductor: false`; `disabledCanaries: ["all"]` for canary offers only). The previous wording implied the flock's two-level cascade, which CoalMine's code does not implement.
- Relicensed from MIT to Apache-2.0. `LICENSE` is now the Apache License 2.0 (verbatim); a new `NOTICE` carries the attribution; the `plugin.json` `license` field is `Apache-2.0`. No code or behavior change.

## [3.8.4] — 2026-07-02

Board round-3 LOW: a config read-time clamp the earlier Board #2 clamp pass missed on the same-class sibling.

### Fixed
- **[LOW] `tempSweepStaleDays` was read raw with no read-time clamp.** `hooks/rot-canary-stop.js` `getTempSweepStaleDays()` returned `cfg.tempSweepStaleDays` straight from an untrusted project `.coalmine.json`, unlike its in-file sibling `autoScanFileCap` (clamped `Math.max(1, Math.floor(n))` since v3.7.12, with a comment naming exactly this hazard). A **negative** value pushes the sweep cutoff into the future → `mtime < cutoff` holds for every `rot-canary-*` temp, so `sweepStale` would delete ALL of them, including a concurrent session's fresh temp; a fractional value skews the cutoff. Confined to CoalMine's own `os.tmpdir()` namespace + fail-silent + self-inflicted config → LOW, but a real same-class miss. Clamped to a non-negative integer (schema `min:0`, floor at 0; NaN/non-finite → the factory default 7) in **both** the Node hook and the PowerShell twin `alt/powershell/rot-canary-stop.ps1` (which read `$cfg.tempSweepStaleDays` into `$staleDays` with the identical gap — Node≡PS parity). New hermetic regression in `scripts/lib/hooks.test.mjs` (a negative override must not delete a fresh concurrent-session temp), mirroring the existing `autoScanFileCap` clamp tests.

## [3.8.3] — 2026-07-02

Board-audit fixes (two parallel nasa/standard boards, every finding reproduced by a judge running the code). Headline is a shipped-hook ReDoS; the CI test-gate hole and doc-accuracy nits ride along.

### Fixed
- **[HIGH] Conductor ReDoS — the SessionStart gold-rule scan was O(n²) on a poisoned rule file.** `hooks/coalmine-conductor.js` `countPastDueStamps` ran a global capturing `STAMP_RE` (two lazy `[\s\S]*?`) over every `.claude/rules/**/*.md` + `.agents/rules/**` + `AGENTS.md` whole-file on every session start; a rules file with many `<!-- coalmine: verified` openers and no closing `-->` made each opener's lazy match walk to EOF → N openers × O(N) = quadratic. Judge/independent timing on that shape: 1 MB ≈ 2.3 s, 2 MB ≈ 9.2 s (clean quadratic doubling), so a cloned/untrusted repo carrying a large poisoned `.md` could hang the session start (Phoenix #3 "≤100ms" violated ~100×; fail-silent doesn't help — the loop returns, it just stalls). Fixed by mirroring the exact guard the sibling `scripts/lib/consistency.mjs` already carries (v3.7.9 CM-1): a cheap non-backtracking `STAMP_OPEN` locates each opener, and the capturing pattern runs over only a bounded `STAMP_WINDOW = 2048`-char slice per opener → per-opener regex work is O(1), so O(n) over the file (2 MB ≈ 0.46 s). New hermetic regression in `conductor-update.test.mjs` fails loud on the old O(n²) (wall-clock ceiling) and pins that a real past-due stamp buried in a large file is still counted. (No PowerShell twin: the conductor is Node-only — the PS ports are the rot-canary touch/stop hooks, neither of which scans stamps.)
- **[HIGH] CI test-gate had no missing-file guard.** `.github/workflows/ci.yml` passed a hardcoded 8-file list to `node --test`; on Node 24 a missing file arg alongside a present one is reinterpreted as a zero-match name filter → the run can exit 0 with a renamed/deleted test silently dropped from the authoritative `main` gate. The local pre-commit/pre-push hooks already guarded with `[ -f "$t" ]`, but CI did not. New **`scripts/test.mjs`** — the single guarded node-test runner (existsSync precheck + on-disk-orphan check + fail-loud, mirroring CoalTipple's `scripts/test.mjs`); CI and both git hooks now call it, so the test list lives in exactly one place and cannot drift.
- **[MED] `PRIVACY.md` contradicted the code on where hooks write.** It said the hooks "write only to your OS temp directory and their own session markers," but the conductor writes a persistent `~/.claude/.coalmine-update-check` date stamp and rot-canary reads `~/.claude/.rot-canary-mode` (SECURITY.md already disclosed these). Reworded to name the `~/.claude/` update-stamp + mode/opt-out files, all local, none transmitted.
- **[LOW] `disabledCanaries` example overstated the mechanism.** The `platform-configs/.coalmine.json` comment and the README `--disable` example listed `drift-canary` (a skill-canary the key honors only advisorily) as if disable-able like `rot-canary`. Reworded: the key is mechanically enforced for the hook-driven canaries (`rot-canary`, `conductor`) plus `all`; skill-canaries honor it advisorily.
- **[LOW] `commands/stats.md` said "two sections" but delivers three** (canary activity · rule freshness · definitions freshness). Count corrected.
- **[LOW] Dead sub-expression in the rot-canary merge-conflict tripwire.** `hooks/rot-canary-touch.js` tested `/^(<<<<<<< |>>>>>>> |=======$)/` only after a `<<<<<<< `/`>>>>>>> ` bracket was already confirmed present, so the `=======$` alt could never independently fire. Collapsed to the single bracket test.

### Notes
- Reproducibility: the conductor ReDoS was confirmed by independent hermetic timing (not lens assertion); the CI gate hole was reproduced on Node 24.17.0. No `plugin/` runtime capability was added — this is a bug-fix + gate-hardening PATCH.

## [3.8.2] — 2026-06-21

Gold-standard wizard CHANGE-path correctness (parity with CoalBoard v1.4.2). This touches the shipped `plugin/`, so it earns the bump; the previously-unreleased PowerShell/CI repo fixes below ride along on this tag.

### Fixed
- **Wizard `change` now recomputes the bill + re-consents (`bill → change → bill → pay`).** The programmer-path confirm in `references/wizard.md` said "go / change / cancel → spawn only on go" but never specified that `change` must loop back → RECOMPUTE the bill → re-present a FRESH consent box — so a change (→ Heavy fan-out · +FILL · +CONFORM) could score/spawn on a stale, un-reconsented bill. Now spelled out; spawn only on a `go` of the CURRENT bill. (Same consent-integrity fix as CoalBoard v1.4.2.)
- **[CRITICAL] PowerShell `disabledCanaries` kill-switch was dead for single-element arrays.** `{"disabledCanaries":["rot-canary"]}` / `["all"]` / legacy `{"disable":["all"]}` failed to disable the canary on Windows PowerShell 5.1 (the Windows default) — it still recorded + nudged + swept. Root cause: an `if`-expression assignment enumerated a single-element `Object[]` into a scalar `String`, then a `-is [array]` guard dropped the scalar to `@()`. Fix: `$disabledArr = @($disabled)` (force-array) in both `rot-canary-touch.ps1` + `rot-canary-stop.ps1`; the old in-code comment misdiagnosed it as `ConvertFrom-Json` unwrapping (it preserves single-element arrays — `watchedExtensions` was always safe) — comment corrected.
- **[HIGH] PowerShell merge-conflict tripwire false-fired on a bare `=======` banner.** Ported the Node co-occurrence guard (CHANGELOG [3.7.11]): flag `=======` only when a `<<<<<<< `/`>>>>>>> ` bracket co-occurs.
- **[HIGH] CI ran fewer tests than the local hooks** (`ci.yml` ran 6, the git hooks run 8). Added `jsonc.test.mjs` + `conductor-update.test.mjs` (+ a PowerShell parity step) to CI; corrected the false "same gate" comment.
- **`configure.mjs`** now fails loud (exit 1) on a malformed `.coalmine.json` (was a silent exit 0) — scripts-quality §1.
- **`install.mjs`** guards against writing a root `.coalmine.json` into the source repo (self-pollution).
- **`consistency.mjs`** JSONC-sync gate notes the 3rd (PowerShell) stripper copy it cannot byte-compare.
- New **`scripts/lib/ps-hooks.test.ps1`** (10 hermetic PowerShell spawn assertions covering both bugs above) + 3 new node tests (configure fail-loud, install self-pollution ×2) → **72 node tests** + 16+10 PowerShell.

## [3.8.1] — 2026-06-21

Gold-standard wizard flow-correctness + token-minimization — the v3.8.0 wizard shipped with an embed defect and a latent double-ask. Two adversarial loop-until-correct dogfood passes (trace every action → fix → re-verify; then squeeze tokens → re-verify all bars).

### Fixed
- **EMBED (the headline) — layman `go deeper` now firmly binds the rules.** It was `AUDIT + FILL` (rules written to disk but NOT in force this session → the layman then hit a separate redundant ADOPT gate to make them binding). Now `AUDIT + FILL + ADOPT` in that one consent — the gaps are written into the project's rules home AND made binding, so gold rules firmly bind without a second prompt. CONFORM (existing-code retrofit) stays a separate explicit gate.
- **Latent double-ask on the layman path closed.** The layman box now states the Standard default IS the resident escalation-footer's tier — so the footer fires no second tier question on that path (the programmer box already folded it).

### Changed
- **Token-minimized.** A second loop squeezed the on-demand wizard 1551 → 1449 ch; every cut was re-verified against all 4 correctness bars (flow · no-double-ask · embed · no-dup), and 11 further cuts were rejected as bar-breaking = maximally lean. `SKILL.md` (resident) untouched.

Gate: build + 69 node tests + consistency + verify PASS.

## [3.8.0] — 2026-06-21

Gold-standard gains an interactive setup wizard (manual `/gold-standard` only — the auto/keyword path is untouched and pays nothing for it).

### Added
- **`gold-standard/references/wizard.md` — dual-audience interactive setup**, read on-demand when a user runs `/gold-standard` manually:
  - **Layman** (bare `/gold-standard` / "audit my rules"): AI picks safe defaults (relevant dimensions from one cheap scan · Standard · AUDIT), then asks ONE plain jargon-free question (`go` · `go deeper` · `cancel`).
  - **Programmer** ("advanced" / `ACTION=`): one batched question-box (ACT · DIMENSIONS · TIER) → bill computed FROM the picks → `go`/`change`/`cancel`. Order → bill → pay (bill after picks = never a stale default).
- A one-line manual-entry pointer in `gold-standard/SKILL.md`; the Triggers/auto path skips the wizard, so the always-resident body and the cheap auto path stay unchanged.

### Notes
- Token-economy dogfood (a sub simulated both paths + dumped every step): the wizard's TIER question is **folded into** the resident escalation-footer's existing tier-pick — never asked twice — removing a duplicate round-trip and a contradictory instruction; the ADOPT/CONFORM choice-gate is stated once (pointer to SKILL.md) instead of three times. Net ~27% leaner than the first draft.

Gate: build + 69 node tests + consistency + verify PASS.

## [3.7.12] — 2026-06-21

Board-audit round-2 fixes (sub4-reproduced) — config-clamp hardening; behavior unchanged on valid config.

### Fixed
- **rot-canary stop-hook clamps `autoScanFileCap` / `autoScanFileCapSlice` at READ (#2).** `{0}` no longer emits an empty-list "scan these (capped at 0)" nudge; `{-1}` no longer silently drops the last touched file; the PowerShell twin clamps identically (`Select-Object -First -1` no longer throws → Node≡PS parity restored). `Math.max(1, Math.floor(n))` at read time.
- **`updateCheckDays` parity (#4/#5).** config-schema adds `max:365` (had `min:1` only); the conductor guard is now `Number.isInteger(v) && 1<=v<=365` (was `>=1` only — accepted `1.5`/`99999`). Parity with CoalBoard + CoalTipple.
- +5 hermetic regression tests (64 → 69 node tests) proving each clamp closes its edge case.

Gate: build + 69 node tests + consistency + verify PASS.

## [3.7.11] — 2026-06-21

Board-audit fixes (verify-triaged from the whole-Colliery nasa board, 28/139 confirmed) — bugfixes only, no behavior change to the canaries.

### Fixed
- **PS-config parity test now gated** — `scripts/lib/ps-config.test.ps1` wired into pre-commit + pre-push (skip-if-absent pwsh; fail-loud when present). Closes the scripts-quality §2 gap where a PowerShell-side regression could ship silently.
- **JSONC-stripper sync gate** — new `consistency.mjs checkJsoncRegexSync` fails if the comment-stripper regex in `scripts/lib/jsonc.mjs` and `hooks/_shared/node-config.js` ever diverge (was hand-duplicated, ungated).
- **merge-conflict tripwire FP** — `rot-canary-touch.js` flags a `=======` line only when a real `<<<<<<< `/`>>>>>>> ` marker co-occurs (a bare 7-equals banner no longer false-positives).
- **`>maxLines` off-by-one** — a file at exactly the cap (with or without a trailing newline) is no longer flagged.
- **platform hook templates** — the 5 `platform-configs/hooks/*.json` now quote the node script path (no word-split on a path with spaces; hooks-safety §3).
- **fix-mode safety guard** — the scale/telemetry/testability/drift "Apply safe …" bullets now carry the checkpoint → build/test → revert-if-red guard the other canaries already have.
- **`install.mjs`** — `copyDefaultConfig` warn path sets `process.exitCode = 1` (fail-loud, scripts-quality §1).
- **README** — the Configuration-Schema table is completed to all 23 keys (was 6), sourced from `config-schema.mjs`.
- **issue-template** — Antigravity added to the agent dropdown (it is a supported install target).

Gate: build + 64 node tests + consistency (+ new jsonc-sync) + verify PASS.

### Notes
- **Erratum to the [3.7.8] "Platform-fact accuracy (M9)" entry.** That entry's wording ("Dropped the scrapped Antigravity entry from the orchestration escalation footer") over-scoped. The Antigravity removal landed in the references/escalation.md Heavy-lever table only; the always-resident `ask_question` alias footer still names Antigravity, which is correct — **Antigravity remains a fully-supported install target.** Antigravity is not "scrapped"; future CHANGELOG entries will not imply it is.

## [3.7.10] — 2026-06-21

SKILL.md load-path carve (token economy) — every canary's behavior unchanged.

### Changed
- **#9 / #18 carve** — the escalation footer (the 2 shared partials injected ×9) compressed −27.6% (4170 → 3019 chars/injection = **−10,359 resident chars across the 9 skills**); the per-platform Heavy-lever table + Heavy-durability prose moved to a NEW shared `references/escalation.md` (build-injected into all 9, loaded ON-DEMAND, off the Light/auto/Stop-hook path). Plus per-skill body trims. Total always-loaded resident cost **−17%** (68,343 → 56,695 chars). The always-resident footer keeps every auto/hook-path behavior (the tier rubric, the +1 scoring, the `ask_question` gate, Hook Context, the entanglement domain-map, self-error-report). Rolls the CoalBoard load-path carve (skill-authoring §4) to CoalMine.
- New `scripts/lib/render.mjs` shared-references mechanism (writes the one source verbatim into each skill's `references/`, propagated to dist + every install target + manifest hashing) + a `scripts/verify.mjs` `checkSharedReferences` byte-sync check (with a negative test: a tampered dist shared-ref fails the gate). +3 render tests (61 → 64 node tests).

Gate: build + 64 node tests + consistency + verify PASS.

## [3.7.9] — 2026-06-21

Round-2 dogfood audit (CoalBoard whole-Colliery, the user as customer) — CLI + consistency-gate bugfixes. The shipped skill runtime is unchanged.

### Fixed
- **CM-2:** `scripts/configure.mjs` `parseValue` now reuses `validateValue` (enforces `max`, not just `min`; `Number` not `parseInt`) — the CLI no longer silently accepts out-of-bounds (`--autoScanFileCap 1001` is now rejected). Kills the two-parser drift + the float-truncate footgun.
- **CM-1:** `scripts/lib/consistency.mjs` runs `STAMP_RE` over a bounded `STAMP_WINDOW` (2048 chars) per opener — the quadratic backtracking on a poisoned rules `.md` (reachable via manual `node scripts/consistency.mjs`) is now O(1)/opener → linear over the file.
- **sweepStale guard:** `hooks/rot-canary-stop.js` runs the housekeeping sweep ONLY on the active (auto) path — behind the disabled/manual/off guards, matching the PowerShell twin (Node≡PS parity). +2 hermetic tests.
- **CM-DM (doc):** `checkDoctrineMirrors` comment corrected to its honest scope (it mirrors the in-repo `.claude`/`.agents` copies; the org `.github` copy is a separate repo, out of runtime reach — org-sync is a release-time concern).

Gate: build + verify + 61 tests + consistency PASS.

## [3.7.8] — 2026-06-20

CoalBoard-audit hardening (dogfood) — PowerShell-parity fixes + doc/config accuracy.

### Fixed
- **PowerShell hooks — session_id sandbox allowlist (H3).** `rot-canary-stop.ps1` / `rot-canary-touch.ps1` now enforce the same `^[A-Za-z0-9_-]+$` allowlist as the Node twins (Phoenix #10), so a traversal-shaped `session_id` cannot escape `$env:TEMP`. Centralised in `hooks/_shared/ps-config.ps1`.
- **PowerShell JSONC stripper (H4).** Ported the Node string-aware `stripJsonc` to PowerShell — the old `^\s*//` regex stripped only full-line comments, so a legal inline `// comment` broke `ConvertFrom-Json` and the ENTIRE `.coalmine.json` was silently ignored on PS hooks (Node honoured it). Now inline comments are stripped and `//` inside strings is preserved. + a Node≡PS stripper-equivalence assertion and a hermetic PS test (`scripts/lib/ps-config.test.ps1`).
- **`config-schema.mjs` int validation (M4).** Ints validate with `Number.isInteger` (rejects `1.5`/`NaN`/`Infinity`) + `min`/`max` bounds on every int key — e.g. `tempSweepStaleDays` ≥ 0 (a `-1` made the PS sweep `AddDays(+1)` delete live-session temp files); `autoScanFileCapSlice` ≥ 1.
- **PowerShell/Node parity (LOW).** `.touched` dedup lowercases on win32 (matching Node — no case-duplicate entries); a scalar `"all"` from `ConvertFrom-Json` no longer disables (matching Node's array guard).

### Changed
- **SECURITY.md scan provenance (M5).** Synced the version-transition guard comment to the prose (SkillSpector v2.2.3 · v3.7.7 · 100/100 · 10 FP · 2026-06-20).
- **Platform-fact accuracy (M9).** Dropped the scrapped "Antigravity" entry from the orchestration escalation footer (rendered into all 9 skills) and the issue-template dropdown; removed the unverifiable "Windsurf (now Devin)" attribution (the churn disclaimer already covers it).

### Removed
- **Stray root `.coalmine.json`.** The maintainer's tuned machine config had been tracked at the repo root since v3.7.1; removed. Config is create-if-absent and `platform-configs/.coalmine.json` is the shipped template — no project-level config ships.

## [3.7.7] — 2026-06-19

Path-safety hardening — defense-in-depth on the hook + installer file paths.

### Fixed
- **rot-canary hooks (`rot-canary-touch.js`, `rot-canary-stop.js`)** — the `session_id` used to build the temp-state path is validated (`/^[A-Za-z0-9_-]+$/`) before use, so a malformed/crafted session_id cannot traverse outside `os.tmpdir()` (Phoenix #10 sandbox containment).
- **`install.mjs safeSkillNames`** — a skill name about to be `rmSync`'d must be a plain basename (`/^[A-Za-z0-9_-]+$/` AND `s === path.basename(s)`); anything else is dropped, never deleted. + a hermetic traversal test in `hooks.test.mjs`.

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
