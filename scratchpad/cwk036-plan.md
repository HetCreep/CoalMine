# CWK-036 — CoalMine release-body conform. Plan + running log.

55 releases. Audit source: `scratchpad/cwk036-releases.json` (fetched authenticated),
classified against the live CHANGELOG. Classes sum to 55.

## Deliverable 1 — `[3.17.4]` CHANGELOG entry: DONE

NOT reconstructed — **RECOVERED VERBATIM**. Evidence chain:
- `git show v3.17.4:CHANGELOG.md` HAS the entry: the tag shipped WITH it.
- `git log -S"## [3.17.4]" -- CHANGELOG.md` names two commits: `c5f56cf` (added it, the
  v3.17.4 release commit) and **`583c32b`** (removed it).
- `583c32b` is this room's own F22 CLASSIFY-BLOCK unit — it silently deleted the
  `[3.17.4]` section while inserting `[3.18.0]`. My own regression, caught by main's
  release audit, not a chain-step-1 miss at press: step 1 was performed correctly.
- Restored byte-verbatim + an HTML-comment back-fill marker naming the deleting commit.
- Confirmed present and in version order; `verify.mjs` PASS.

## Classification (55 = 12 + 2 + 9 + 32)

**CLEAN (12)** — body H3s match the entry's, same set + order. No action.
`v3.14.3 v3.14.2 v3.14.1 v3.12.4 v3.9.3 v3.9.2 v3.9.1 v3.8.2 v3.8.1 v3.7.9 v3.7.2 v3.6.0`

**ORDER/SET-MISMATCH (2)** — part-2 1:1 genuinely broken. HIGHEST VALUE.
- `v3.15.0` entry `Added,Changed,Fixed` vs body `Added,Changed` — a whole `### Fixed`
  section is MISSING from the body.
- `v3.7.1` entry `Added,Changed,Removed,Security` vs body `Changed,Removed,Security,Added`
  — re-ordered; the manual bans re-ordering explicitly.

**WRONG-LEVEL / CUSTOM (9)** — CoalBoard's class.
- Pure level slip, canonical name already, `##` should be `###` (mechanical, no part-5):
  `v3.18.2 v3.18.1 v3.18.0 v3.17.4 v3.17.1 v3.8.4`
- Custom prose headings, need judgment (content rebuild, part-5 owed):
  `v3.17.0` (`## What shipped`) · `v3.7.5` (`## Added` + `## Why`) · `v3.7.0`
  (`## install.mjs …` + `### Also in 3.7.0`)

**HEADINGLESS (32)** — body has no headings while the entry HAS them, so each is a real
part-2 violation (the scope guard does not exempt them). Content rebuild, part-5 owed.
Newest-first (the panel is a front door, so the newest are read most):
`v3.17.3 v3.17.2 v3.16.0 v3.14.0 v3.13.0 v3.12.3 v3.12.2 v3.12.1 v3.12.0 v3.11.4
v3.11.3 v3.11.2 v3.11.1 v3.11.0 v3.10.0 v3.9.0 v3.8.5 v3.8.3 v3.8.0 v3.7.12 v3.7.11
v3.7.10 v3.7.8 v3.7.7 v3.7.6 v3.7.4 v3.7.3 v3.5.1 v3.5.0 v3.4.0 v3.3.0 v3.2.1`

## Execution order
1. ORDER/SET-MISMATCH (2) — worst 1:1 break.
2. WRONG-LEVEL pure (6) — mechanical.
3. CUSTOM prose (3).
4. HEADINGLESS (32), newest first.

Titles: gate reports 0 findings flock-wide; separator/prefix not re-derived here.

## LOG — appended only AFTER a fresh re-GET confirms each edit
- v3.15.0 — VERIFIED by re-GET · ORDER/SET: added the missing ### Fixed section from the entry (content rebuild, part-5 line added)
- v3.7.1 — VERIFIED by re-GET · ORDER: re-ordered to entry order + dropped duplicate in-body H2 title + Added-variant consolidated (content rebuild, part-5 added)
- v3.18.2 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.18.1 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.18.0 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.17.4 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.17.1 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.8.4 — VERIFIED by re-GET · WRONG-LEVEL: ## -> ### on canonical heading(s); mechanical, content untouched, no part-5 owed
- v3.17.0 — VERIFIED by re-GET · CUSTOM: ## What shipped -> the entry's own ### Added/### Fixed/### Security; bullets routed by the entry, none invented
- v3.7.5 — VERIFIED by re-GET · CUSTOM: ## Added -> ### Added; custom ## Why mapped to the entry's own ### Note heading
- v3.7.0 — VERIFIED by re-GET · CUSTOM: prose H2 + "Also in 3.7.0" consolidated under the entry's single canonical ### Added (same-category variants)

## CWK-042 (2026-08-31, doc-writer) — 4 of 32 HEADINGLESS drafted, NOT applied
Written to `scratchpad/cwk042-bodies.json` (main applies via PATCH + re-GET verify —
this station never touches the GitHub API). Each: content rebuilt under the entry's
own headings, 1:1, condensed not summarized, part-5 provenance line added.
- v3.17.3 — VERIFIED against CHANGELOG · single ### Security heading, was one unheaded
  paragraph, condensed to 5 bullets (clamp scope, UNION direction, the 2 escalation
  holes, PS port, CI findings-back)
- v3.17.2 — VERIFIED against CHANGELOG · single ### Fixed heading, was 2 sentences,
  condensed to the mechanism fix; dropped the entry's internal process-lesson sentence
  (not a shipped-behavior claim)
- v3.16.0 — VERIFIED against CHANGELOG · single ### Added heading (2 bullets), kept the
  PS-fallback named-divergence caveat the old headingless body had dropped, added part 3
- v3.14.0 — VERIFIED against CHANGELOG · 3 headings (Added/Fixed/Changed) in the entry's
  own order, was a marketing-toned bold-banner body with no headings; dropped the
  promotional framing

## CWK-042 ROUND 2 (2026-08-31, doc-writer) — remaining 28 of 32 HEADINGLESS, ALL DONE
Written to `scratchpad/cwk042-bodies-2.json` (10) + `-3.json` (9) + `-4.json` (9) = 28.
Combined with round 1's `cwk042-bodies.json` (4): **32/32 HEADINGLESS tags now drafted**,
none applied yet — main applies via PATCH + fresh re-GET, this station never touches the
GitHub API. Cross-checked: 4 files, 32 entries, 32 unique tags, 0 missing against the
round-2 list of 28.
- v3.13.0 v3.12.3 v3.12.2 v3.12.1 v3.12.0 v3.11.4 v3.11.3 v3.11.2 v3.11.1 v3.11.0 —
  VERIFIED against CHANGELOG · `cwk042-bodies-2.json`
- v3.10.0 v3.9.0 v3.8.5 v3.8.3 v3.8.0 v3.7.12 v3.7.11 v3.7.10 v3.7.8 —
  VERIFIED against CHANGELOG · `cwk042-bodies-3.json`
- v3.7.7 v3.7.6 v3.7.4 v3.7.3 v3.5.1 v3.5.0 v3.4.0 v3.3.0 v3.2.1 —
  VERIFIED against CHANGELOG · `cwk042-bodies-4.json` — v3.5.0 was the one genuine
  set/order peculiarity in this whole 32-tag pass: its entry carries 3 non-consecutive
  `### Added` sections interleaved with one `### Fixed`; merged the 3 Added sections
  under one canonical heading per the manual's permitted same-category merge, kept
  Fixed separate and after.

## HEADINGLESS class: CLOSED, 32/32 drafted
No remainder. The two other CWK-036 classes (ORDER/SET-MISMATCH ×2, WRONG-LEVEL/CUSTOM
×9) were already closed in the log above this section, before this station's dispatch.

Each: body carries no headings while its entry HAS them = part-2 1:1 violation. Fix is a
content rebuild from the entry under the entry's own headings + a part-5 provenance line.
NOT scripted deliberately — condensing is semantic, and a truncate-to-length pass can cut a
caveat mid-sentence, which the manual bans outright ("a Release must never be the surface
where a caveat quietly drops"). Each needs its entry read.
- v3.17.1 — VERIFIED by re-GET · B-1 HIGH (mine): body said ### Fixed, entry has ONLY ### Added -> mirrored the entry; NOT a pure level slip, so provenance now owed and added
- v3.18.0 — VERIFIED by re-GET · B-2 HIGH (mine): the entry's ### Fixed (the release's only bug fix) was missing from the body -> restored from the entry; provenance added, not mechanical after all
- v3.7.1 — VERIFIED by re-GET · B-3 MEDIUM (mine): dropped gate figures with ZERO hits in the entry (never re-run to justify a number)
- v3.8.4 — VERIFIED by re-GET · B-3 MEDIUM (mine): dropped gate figures with ZERO hits in the entry (never re-run to justify a number)
- v3.15.0 — VERIFIED by re-GET · B-4/B-5 MEDIUM: stripped internal rule/scratchpad identifiers the manual bans in a Release body
- v3.18.0 — VERIFIED by re-GET · B-4/B-5 MEDIUM: stripped internal rule/scratchpad identifiers the manual bans in a Release body
- v3.17.3 — VERIFIED by re-GET · B-4/B-5 MEDIUM: stripped internal rule/scratchpad identifiers the manual bans in a Release body
- v3.17.3 — VERIFIED by re-GET · DOCS station (doc-writer) · A-1 MEDIUM closed (rule identifier stripped) · Was a single unheaded paragraph; rebuilt under the entry's own single ### Security heading as 5 condensed bullets (clamp
- v3.17.2 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a 2-sentence unheaded paragraph; rebuilt under the entry's own single ### Fixed heading, condensed to the mechanism 
- v3.16.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a 2-sentence unheaded paragraph pointing at the CHANGELOG; rebuilt under the entry's own single ### Added heading as
- v3.14.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a marketing-toned unheaded body (bold MINOR banner, emoji-free bullets, no headings); rebuilt under the entry's own 
- v3.13.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single unheaded paragraph; rebuilt under the entry's own 3 headings (Added/Fixed/Changed), the 3 dev-tooling Fixed
- v3.12.3 — VERIFIED by re-GET · DOCS station (doc-writer) · Was 4 prose bullets plus a gate-numbers line and a 'charter widened' claim about CoalLedger's docsDriftNudge that the CH
- v3.12.2 — VERIFIED by re-GET · DOCS station (doc-writer) · Was 3 bullets under a bold PATCH banner; rebuilt under the entry's single ### Fixed heading, condensed.
- v3.12.1 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single unheaded paragraph; rebuilt under the entry's single ### Security heading. Dropped the old body's own dangl
- v3.12.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was 4 bullets + a dangling generic CHANGELOG link under a bold MINOR banner; rebuilt under the entry's own 2 headings (A
- v3.11.4 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single unheaded paragraph; rebuilt under the entry's single ### Fixed heading as its 2 distinct bullets.
- v3.11.3 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single bolded-lead paragraph; rebuilt under the entry's single ### Fixed heading.
- v3.11.2 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead paragraph plus a dangling CHANGELOG pointer; rebuilt under the entry's single ### Changed heading as i
- v3.11.1 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead paragraph; rebuilt under the entry's single ### Security heading.
- v3.11.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was 2 bolded-lead paragraphs (Added-shaped + Security-shaped) missing the entry's own Fixed and Notes sections entirely;
- v3.10.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a 3-bullet unheaded paragraph with an unsourced gate line; rebuilt under the entry's own 2 headings (Added/Fixed), g
- v3.9.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead paragraph plus a dangling install-command/CHANGELOG-link line; rebuilt under the entry's own 2 heading
- v3.8.5 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead paragraph; rebuilt under the entry's single ### Changed heading as its 3 distinct facts. (Historical n
- v3.8.3 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list compressing 6 fixes into 4 lines; rebuilt under the entry's own 2 headings (Fixed/Notes) p
- v3.8.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list plus an install-restart line; rebuilt under the entry's own 2 headings (Added/Notes), gate
- v3.7.12 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list plus an install-restart line; rebuilt under the entry's single ### Fixed heading, gate lin
- v3.7.11 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list plus an install-restart line; rebuilt under the entry's own 2 headings (Fixed/Notes), gate
- v3.7.10 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list plus an install-restart line; rebuilt under the entry's single ### Changed heading, gate l
- v3.7.8 — VERIFIED by re-GET · DOCS station (doc-writer) · Was bold-labeled Fixed/Changed/Removed prose (not headings); rebuilt under the entry's own 3 headings in order. Dropped 
- v3.7.7 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead 2-bullet paragraph; rebuilt under the entry's single ### Fixed heading.
- v3.7.6 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead 4-bullet paragraph; rebuilt under the entry's single ### Changed heading.
- v3.7.4 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead paragraph; rebuilt under the entry's own 2 headings (Fixed/Changed).
- v3.7.3 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list; rebuilt under the entry's own 3 headings (Changed/Fixed/Security) in order.
- v3.5.1 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single unheaded bullet; the entry's own heading was a parenthetical variant ("### Fixed (security — caught by rot-
- v3.5.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was 4 separate bolded-lead paragraphs with no headings; the entry itself carries 3 non-consecutive ### Added sections in
- v3.4.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list; rebuilt under the entry's single ### Changed heading.
- v3.3.0 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a bolded-lead bullet list; rebuilt under the entry's own 2 headings (Added/Fixed).
- v3.2.1 — VERIFIED by re-GET · DOCS station (doc-writer) · Was a single unheaded bullet; rebuilt under the entry's single ### Fixed heading.
- v3.7.5 — VERIFIED by re-GET · A-2 LOW: dropped a "restart Claude Code" instruction absent from the entry
- v3.18.2 — VERIFIED by re-GET · B-6 LOW: part-1 lead added (one sentence, from the entry)
- v3.18.1 — VERIFIED by re-GET · B-6 LOW: part-1 lead added (one sentence, from the entry)
- v3.17.4 — VERIFIED by re-GET · B-6 LOW: part-1 lead added (one sentence, from the entry)
- v3.7.2 — VERIFIED by re-GET · C-1 (my own miss, mis-classified CLEAN in round 4): dropped a duplicated in-body H2 title; heading set/order already matched the entry, content untouched
- v3.14.1 — VERIFIED by re-GET · C-2 (my own miss, mis-classified CLEAN in round 4): stripped a banned rule identifier; heading set/order already matched the entry

## CWK-042 — the 32 HEADINGLESS class CLOSED + INSPECT fixback
DOCS = doc-writer (2 dispatches, 32/32 drafted; it judged its own stop, not my estimate).
INSPECT = code-reviewer, verdict `.claude/agent-memory/code-reviewer/INSPECT-cwk042.md`.
- 32 drafts applied, each verified by fresh re-GET (A-1 rule-identifier closed in-flight).
- Reviewer findings on MY OWN 11, all closed by me (the maker): B-1 v3.17.1 HIGH (body
  filed under ### Fixed, entry has ONLY ### Added -> mirrored; NOT a pure level slip, so
  provenance was owed and is now added) · B-2 v3.18.0 HIGH (the entry's ### Fixed, the
  release's only bug fix, was missing -> restored) · B-3 v3.7.1/v3.8.4 (gate figures with
  0 hits in their entry, deleted not re-run) · B-4/B-5 v3.15.0/v3.18.0 identifiers ·
  B-6 leads on 3 slips · A-2 v3.7.5 "restart Claude Code" absent from the entry.
- MY OWN post-fix sweep found 2 MORE I had mis-classified CLEAN in round 4:
  v3.7.2 (duplicate in-body H2 title) · v3.14.1 (banned rule identifier). Both closed.
  The round-4 "CLEAN 12" call was too shallow -- it compared heading SET/ORDER only and
  never checked title duplication or banned identifiers.
- Final independent sweep of all 55: H2-in-body NONE, banned-identifier NONE, empty NONE.
