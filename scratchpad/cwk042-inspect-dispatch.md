DISPATCH — CWK-042 station INSPECT. You are CoalMine's code-reviewer. Room cwd is your repo.

Spec: `C:/Users/zxc59/source/repos/TheColliery/.github/RELEASE-PATTERN.md`. Read it END TO
END first — it is the bar, not my summary. Source of truth for every claim: this room's
own `CHANGELOG.md`.

## TWO subjects, and the second is why this station exists

**(A) 32 DRAFT bodies — `scratchpad/cwk042-bodies-ALL.json`** (tag/body/note), written by
this room's doc-writer across 4 batches. NOT published yet. Your findings on these bounce
to the DOC-WRITER.

**(B) 11 ALREADY-PUBLISHED bodies — `scratchpad/cwk042-round4-live.json`** (fetched live
from GitHub minutes ago, so this is what the public actually sees). **I rebuilt these
myself and SHIPPED them with no second pair of eyes.** A sub verifying its own work is
not review, and that applies to me. Your findings on these bounce to ME.
The 11: v3.15.0 v3.7.1 (order/set rebuilds) · v3.18.2 v3.18.1 v3.18.0 v3.17.4 v3.17.1
v3.8.4 (pure `##`->`###` level slips) · v3.17.0 v3.7.5 v3.7.0 (custom-prose rebuilds).
Judgment calls I made on those three that you should attack, not inherit:
- v3.17.0: `## What shipped` replaced by the entry's own `### Added`/`### Fixed`/
  `### Security`, each existing bullet ROUTED to a category by board number. Did I route
  any bullet to a heading its entry does not file it under?
- v3.7.5: custom `## Why` mapped onto the entry's own `### Note`. Is that mapping honest?
- v3.7.0: a prose H2 + `### Also in 3.7.0` consolidated under the entry's single
  `### Added`. Permitted same-category merge, or a disguised cross-category merge?
- v3.7.1: I dropped a duplicate in-body H2 title and consolidated an
  `Added (carried from Unreleased)` variant under canonical `### Added`.
- The 6 level slips: I claimed no part-5 provenance line is owed because they are
  mechanical. Verify that claim rather than accepting it.

## What to check, per body
1. Part-2 1:1 against that tag's OWN entry: same heading SET, same ORDER, nothing invented,
   nothing dropped. This is the whole point.
2. **A claim in the body that is NOT in the entry** — the most damaging class here. Also:
   a caveat the entry carries that the body silently drops.
3. Part-5 provenance line present where owed (the 32 drafts + the 5 content rebuilds).
4. Parts 3/4 conditional — manufactured where the entry does not support them?
5. Level correctness (`###`, not `##`), case-only heading mismatch, cross-version content
   bleed, mojibake, marketing language the manual bans.
6. Permitted merge = same-category variants only. Merging ACROSS categories is banned.

Two doc-writer judgments I already RATIFIED — attack them if they are wrong, do not
re-litigate them if they are right: (a) a closing methodological/process sentence in an
entry stays OUT of the body; (b) `v3.5.0`'s entry has 3 non-consecutive `### Added`
sections + one `### Fixed` — the 3 Added were consolidated, Fixed kept separate.
Also stated by the doc-writer and worth verifying: several old bodies carried
"Gate: N tests PASS" numbers not present in their entry, and those numbers were DROPPED.

## Rails
- Read-only. Do NOT edit any body, do NOT touch the GitHub API, no token needed.
- Verdict per subject: SHIP or FIX-NEEDED, with findings named tag by tag.
- Write the verdict to `.claude/agent-memory/code-reviewer/INSPECT-cwk042.md` (disk-first),
  then return a short summary pointing at it.
- CANARY LAW (§8c): a canary blocking your exit with findings — FIX THEM IN THAT TURN, do
  not route the ask up (an ask travels up only for an OWNER press), then RE-STATE YOUR
  COMPLETE RETURN as your new final message.
- Pending decisions: silence is not "none".
