# Script Quality and Release Rules

<!-- coalmine: verified 2026-06-12 · exemplar npm + Cargo + husky + Keep a Changelog · revalidate 90d -->

Scope: user-invoked CLI scripts (`scripts/*.mjs`) and release bookkeeping for the CoalMine repo itself. Hooks follow [hooks-safety.md](./hooks-safety.md) (fail-silent); CLI scripts follow the OPPOSITE discipline — fail loud.

## 1. CLI Exit-Code Discipline (Fail Loud)

User-invoked scripts must exit non-zero when any unit of work fails, including partial failures (exemplar: `npm install` exits non-zero on any package failure).

- Per-item catch blocks may warn and continue, but must set `process.exitCode = 1`.
- Done-summary lines must report failed counts (e.g. `Done: 8/9 skill(s), 1 failed`).
- Gate scripts (`verify.mjs`) must wrap every per-item check in try-catch so one corrupt input yields a clean `FAIL <item>: <reason>` line and the remaining checks still run — never a raw stack trace.
- Gates must check both directions: source→dist staleness AND dist-only orphans (nothing ships that has no source).

## 2. Zero-Dep Unit Tests for Core Logic

Core shared logic (`scripts/lib/`) must have unit tests runnable with built-ins only: `node --test` (node:test — available since Node 18, stable since Node 20; exemplar: husky keeps automated tests despite a ~2 kB codebase).

- Cover at minimum: SHARED marker injection, `{{*_INTENT}}` placeholder substitution, missing/corrupt `skill-meta.json` fallback, recursive skill-dir copy.
- The verify gate must have at least one automated negative-path test (stale dist → exit 1; exemplar: Cargo blocks publish from a dirty working tree).
- Wire `node --test <explicit test-file list>` into the pre-commit AND pre-push hooks alongside `verify.mjs` — enumerate every test file and fail loud if a listed file is missing (`node --test` silently ignores missing file args, and the directory form proved unreliable on Node 24: MODULE_NOT_FOUND).

## 3. Release Bookkeeping

On every version bump in `.claude-plugin/plugin.json` (exemplars: Keep a Changelog convention, keepachangelog.com; Cargo registry checksums culture):

- Add a `CHANGELOG.md` entry at repo root in keep-a-changelog format.
- Create an annotated git tag `vX.Y.Z` and push it with `--follow-tags` — the GitHub remote is canonical since the marketplace submission (supersedes the early local-git-only decision).
- Publish a GitHub Release for every tag (`gh release create vX.Y.Z --title ... --notes ...`) — the tag is history, the Release is the announcement; an empty Releases panel reads as an abandoned repo. Keep the repo About description in sync with the canary count and headline features (it went stale at "5 canaries" for four versions before anyone noticed).
