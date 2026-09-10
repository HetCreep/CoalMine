// CW-017 — a small zero-dep walker for CoalMine's own tracked markdown: internal relative
// links and in-doc anchors, per .github/SKILL-REPO-PATTERN.md:91's canon DEFAULT ("a small
// scripts/lib/link-check.mjs walking the repo's own tracked .md files"). Deliberately NOT an
// AST engine -- CoalLedger's scripts/lib/md-checks.mjs already is one (this room's own
// CWK-092 unit measured it already satisfies the canon), and vendoring a copy here would be
// the duplicate-ownership defect ONE FLOCK ONE COLOR bans (AGENTS.md).
//
// SCOPE: INTERNAL links only -- a relative path to another tracked file, optionally followed
// by a #anchor, or a bare #anchor into the CITING file itself. An external http(s)/mailto/ftp
// target or a site-root `/absolute` path is OUT OF SCOPE by design (Phoenix #7,
// no-external-assumption -- reachability of an external URL needs a network call this room
// does not make; a site-root path needs a hosting root this walker cannot know).
//
// NAMED RESIDUE -- stated rather than implied complete, this room's own habit. The slugifier
// below approximates GitHub's own heading-anchor algorithm (lowercase, punctuation dropped,
// spaces to hyphens, duplicate headings suffixed -1/-2/...) and does NOT special-case:
// non-ASCII (CJK/Thai) headings, inline HTML surviving inside a heading beyond a plain tag
// strip, or reference-style links (`[text][ref]` + a separate `[ref]: target` definition) --
// only INLINE links `[text](target)` are extracted. A doc that exercises just one of these is
// invisible to this walker; the residue is named here so it is never mistaken for coverage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Strip fenced code blocks and inline code spans BEFORE extracting anything -- a
// documentation EXAMPLE showing markdown syntax is not a real link or a real heading.
// Fenced blocks are replaced with the same number of newlines so line-based heading
// matching downstream is unaffected by the removal.
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/`[^`\n]*`/g, '');
}

const HEADING_RE = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:[ \t]+"[^"]*")?\)/g;
const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // a scheme: or a protocol-relative //
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;

// GitHub's own algorithm (documented behaviour of github-slugger, its reference
// implementation): strip a surviving HTML tag, lowercase, drop anything that is not a
// word char / space / hyphen, spaces to hyphens -- DELIBERATELY NO trim step. A heading
// starting with an emoji (common in this repo's own headings, e.g. "## 🔌 Universal
// Agent Support") strips to a LEADING space that GitHub turns into a LEADING hyphen
// (`-universal-agent-support`), never trimmed away -- confirmed against this repo's own
// shipped README/CONTRIBUTING anchors, which is what caught this walker's first-draft
// false-positive (it trimmed, GitHub does not).
function slugify(heading) {
  return heading
    .replace(HTML_TAG_RE, '')
    .toLowerCase()
    .replace(/[^\w \t-]/g, '')
    .replace(/[ \t]+/g, '-');
}

// Every heading's slug, duplicates suffixed -1, -2, ... in document order (GitHub's rule).
export function headingSlugs(text) {
  const seen = new Map();
  const slugs = new Set();
  const stripped = stripCode(text);
  let m;
  HEADING_RE.lastIndex = 0;
  while ((m = HEADING_RE.exec(stripped))) {
    const base = slugify(m[2]);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    slugs.add(n === 0 ? base : `${base}-${n}`);
  }
  return slugs;
}

export function extractLinks(text) {
  const links = [];
  const stripped = stripCode(text);
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(stripped))) {
    links.push({ text: m[1], target: m[2] });
  }
  return links;
}

// One file's findings. `readFile` is injected so a unit test can drive this against an
// in-memory fixture set without touching a real filesystem.
export function checkFile(filePath, repoRoot, readFile = (p) => fs.readFileSync(p, 'utf8')) {
  const findings = [];
  const raw = readFile(filePath);
  const ownSlugs = headingSlugs(raw);

  for (const { target } of extractLinks(raw)) {
    if (!target || target.startsWith('mailto:') || EXTERNAL_RE.test(target)) continue;

    const hashIdx = target.indexOf('#');
    const filePart = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const anchorPart = hashIdx === -1 ? '' : decodeURIComponent(target.slice(hashIdx + 1));

    if (!filePart) {
      // A bare `#anchor` targets a heading in THIS file.
      if (anchorPart && !ownSlugs.has(anchorPart)) {
        findings.push(`${filePath}: dead anchor #${anchorPart} — no matching heading in this file`);
      }
      continue;
    }
    if (filePart.startsWith('/')) continue; // site-root-relative — out of scope, named above.

    const targetAbs = path.resolve(path.dirname(filePath), filePart);
    if (!fs.existsSync(targetAbs)) {
      findings.push(`${filePath}: dead link -> ${target} (not found: ${path.relative(repoRoot, targetAbs)})`);
      continue;
    }
    if (anchorPart && targetAbs.toLowerCase().endsWith('.md')) {
      const targetSlugs = headingSlugs(readFile(targetAbs));
      if (!targetSlugs.has(anchorPart)) {
        findings.push(`${filePath}: dead anchor -> ${target} (no matching heading in ${path.relative(repoRoot, targetAbs)})`);
      }
    }
  }
  return findings;
}

export function checkFiles(filePaths, repoRoot) {
  const findings = [];
  for (const f of filePaths) findings.push(...checkFile(f, repoRoot));
  return findings;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
// `node scripts/lib/link-check.mjs <file> [<file> ...]` — every argument is a path,
// resolved relative to CWD. Prints each finding, then a summary line
// (`N finding(s) across M file(s)`), and sets process.exitCode = 1 on any finding — this
// walker has exactly one consumer (its own workflow step) and no reason to stay exit-0
// on a findings run the way a skill-shared engine would.
function main() {
  const files = process.argv.slice(2).map((f) => path.resolve(f));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const findings = checkFiles(files, repoRoot);
  for (const f of findings) console.log(f);
  console.log(`${findings.length} finding(s) across ${files.length} file(s)`);
  if (findings.length > 0) process.exitCode = 1;
}

// Windows-safe entry-point check: compare RESOLVED PATHS, not raw URL strings --
// `file://C:/...` vs a bare `C:\...` argv never string-match, per node/runtime.md
// section 6's own drive-letter warning.
if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? '')) {
  main();
}
