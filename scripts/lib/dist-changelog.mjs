// The CHANGELOG-vs-dist gate (task #38) — three consecutive rounds shipped changes that
// reached the published plugin/ dist with NO CHANGELOG entry, caught by hand each time
// after the fact. This makes it mechanical.
//
// Keys on "did the DIST change vs the last tag", never "did any file change" — a doc-only
// commit must stay silent (scripts-quality.md section 3: a change that never reaches the
// shipped dist earns no version and no [Unreleased] entry; a gate that fires on one is a
// cry-wolf gate and worse than none).
//
// Baseline = the last version tag, compared against the WORKTREE (not HEAD) — at
// pre-commit time the dist change is staged/unstaged and not yet committed, so this is
// the one comparison shape that agrees at pre-commit, pre-push and CI alike.
//
// Two absences are POSSIBLE and both degrade to a visible, non-blocking SKIP — never a
// silent carve-out, and never a false "nothing changed": not a git repo (or git absent),
// and no tag reachable (the common CI shape: actions/checkout defaults to a shallow,
// single-commit fetch with no tag history unless fetch-depth:0/fetch-tags is set — see
// .github/workflows/ci.yml, which sets neither, so this SKIP fires on EVERY CI run today —
// the gate is local-only in practice until that changes, a separate, out-of-scope press).
// "Could not tell" is not "clean" — this room already paid for that conflation twice in
// consistency.mjs (`isDir`, `walkMd`); the miss direction here is a missed CHANGELOG entry,
// not a false clean bill, so a visible skip is the correct degrade, not a defect to eliminate.
//
// Pure error handling only: every git invocation is wrapped so a corrupt or absent
// binary/repo never crashes the gate — it becomes one of the two named SKIPs above, or a
// FAIL with a reason, per scripts-quality.md section 1.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// The two paths a version bump actually touches: the committed dist directory itself,
// and the repo-root plugin.json (the version SOURCE — copied into plugin/.claude-plugin/
// by build-plugin.mjs, but diffed here too so a version bump is caught the instant it is
// written, even in the intermediate state before a rebuild has run).
const DIST_PATHS = ['plugin/', '.claude-plugin/plugin.json'];

function git(args, repo) {
  return spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function isGitRepo(repo) {
  const r = git(['rev-parse', '--is-inside-work-tree'], repo);
  return r.status === 0 && r.stdout.trim() === 'true';
}

// Exported for its own unit test — the empty-tags case (status 0, empty stdout) is not
// an error and must not be confused with "git failed".
export function resolveLastTag(repo) {
  const r = git(['tag', '--sort=-v:refname'], repo);
  if (r.status !== 0) return null;
  const tags = r.stdout.split(/\r?\n/).filter(Boolean);
  return tags[0] ?? null;
}

// Non-empty section body between a "## [Unreleased]" heading and the next "## " heading
// (or EOF). A bare heading with nothing under it does not count as documented.
function unreleasedBody(lines, headingIdx) {
  const rest = lines.slice(headingIdx + 1);
  const nextIdx = rest.findIndex((l) => /^##\s/.test(l));
  const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx);
  return body.join('\n').trim();
}

export function checkDistChangelog(repo) {
  if (!isGitRepo(repo)) {
    return [{ level: 'SKIP', msg: 'dist-changelog: not a git repository (or git is unavailable) — cannot establish a tag baseline; skipped (a missed CHANGELOG entry, never a false clean bill)' }];
  }

  const tag = resolveLastTag(repo);
  if (!tag) {
    return [{ level: 'SKIP', msg: 'dist-changelog: no version tag reachable (e.g. a shallow CI checkout with no tag history — actions/checkout fetches neither by default) — cannot establish a baseline; skipped (a missed CHANGELOG entry, never a false clean bill)' }];
  }

  // `git diff --quiet <tag> -- <paths>` — exit 0 = clean, exit 1 = a real diff, anything
  // else (bad revision, corrupt repo) is an error this check must not swallow as "clean".
  const diff = git(['diff', '--quiet', tag, '--', ...DIST_PATHS], repo);
  if (diff.status !== 0 && diff.status !== 1) {
    return [{ level: 'FAIL', msg: `dist-changelog: could not diff the dist against ${tag}: ${(diff.stderr || diff.error?.message || 'unknown git error').trim()}` }];
  }
  const distChanged = diff.status === 1;
  if (!distChanged) return [];

  let changelog;
  try {
    changelog = fs.readFileSync(path.join(repo, 'CHANGELOG.md'), 'utf8');
  } catch (e) {
    return [{ level: 'FAIL', msg: `dist-changelog: plugin/ dist differs from ${tag} but CHANGELOG.md is unreadable: ${e.message}` }];
  }

  const lines = changelog.split(/\r?\n/);
  const headingIdx = lines.findIndex((l) => /^##\s*\[/.test(l));
  if (headingIdx === -1) {
    return [{ level: 'FAIL', msg: `dist-changelog: plugin/ dist differs from ${tag} but CHANGELOG.md has no version heading — add an [Unreleased] section documenting the change` }];
  }
  const heading = lines[headingIdx].match(/^##\s*\[([^\]]+)\]/)[1].trim();
  const tagVersion = tag.replace(/^v/, '');

  if (heading.toLowerCase() === 'unreleased') {
    if (unreleasedBody(lines, headingIdx).length === 0) {
      return [{ level: 'FAIL', msg: `dist-changelog: plugin/ dist differs from ${tag} but the [Unreleased] section is empty — add an entry documenting the change` }];
    }
    return [];
  }

  if (heading === tagVersion) {
    return [{ level: 'FAIL', msg: `dist-changelog: plugin/ dist differs from ${tag} but CHANGELOG.md's top heading is still [${heading}] — add an [Unreleased] entry (or a new version heading) documenting the change` }];
  }

  // A version heading for a version OTHER than the last tag (presumably newer) already
  // documents the change — a release in progress that updated CHANGELOG ahead of tagging.
  return [];
}
