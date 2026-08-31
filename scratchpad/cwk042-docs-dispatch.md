DISPATCH — CWK-042 station DOCS. You are CoalMine's doc-writer. Room cwd is your repo.

## The work
32 GitHub Release bodies on `HetCreep/CoalMine` carry NO headings while their own
CHANGELOG entry HAS headings. That is a part-2 1:1 violation of
`C:/Users/zxc59/source/repos/TheColliery/.github/RELEASE-PATTERN.md`. Read that manual
END TO END first — it is the spec, not my summary of it.

Your job: for each tag, condense that tag's OWN `CHANGELOG.md` entry into the 5-part body.

## Inputs already on disk (do not re-fetch)
- `scratchpad/cwk036-releases.json` — every current release body (tag/name/body/id/pre).
- `CHANGELOG.md` — the source of truth each body must trace to 1:1.
- `scratchpad/cwk036-plan.md` — the round's audit + log. READ IT; it has the classification.

## The 32 tags, newest first (front door — newest are read most)
v3.17.3 v3.17.2 v3.16.0 v3.14.0 v3.13.0 v3.12.3 v3.12.2 v3.12.1 v3.12.0 v3.11.4
v3.11.3 v3.11.2 v3.11.1 v3.11.0 v3.10.0 v3.9.0 v3.8.5 v3.8.3 v3.8.0 v3.7.12 v3.7.11
v3.7.10 v3.7.8 v3.7.7 v3.7.6 v3.7.4 v3.7.3 v3.5.1 v3.5.0 v3.4.0 v3.3.0 v3.2.1

## PACING — the owner's own word: `ห้ามฝืนคุณภาพ`, never force the quality
My honest estimate is 3-4 per dispatch at real condensing quality. **6 done well beats
32 done badly.** A remainder is the EXPECTED outcome, not a failure — name the exact tags
you did NOT reach. Do not rush the tail to hit a number.

## Rules that bind every body
- Part 2 mirrors the entry's OWN `###` headings, 1:1 — same set, same order. Never
  re-order, never invent a heading the entry does not have, never drop one it does.
- **NEVER invent a claim absent from the entry.** If the entry does not say it, it does
  not go in the body. Condensing may shorten; it may not add, and it may not silently
  drop a caveat — a Release must never be the surface where a caveat quietly drops.
- Part 5 provenance line on EVERY one of these (they are late rebuilds), exact text:
  `Back-filled 2026-08-31: body re-shaped to the CHANGELOG [X.Y.Z] entry's own headings; written from that entry.`
- Part 3 (what you need to do) and part 4 (gate) are CONDITIONAL — include only if the
  entry genuinely supports them. Do not manufacture either.
- Permitted merge: same-category variants (`Fixed (wave name)`) consolidate under ONE
  canonical heading. Merging ACROSS different categories is banned.
- R3's adoption epoch stays non-backfilled · R6 no-renumbering.
- Title/name field: leave alone this round. Body only.

## Defect classes this round already found — HUNT them, do not re-discover them
headingless-vs-entry-with-headings (your whole batch) · case-only heading mismatch ·
a DIFFERENT version's content wrongly appended to a body · mojibake · `##` where the
canonical level is `###` · a whole section missing from a body while its entry has it
(that was v3.15.0, real).

## Output — disk-first, in-room, NEVER %TEMP%
Write `scratchpad/cwk042-bodies.json`: an array of `{ "tag": "vX.Y.Z", "body": "...",
"note": "one line: what the body was and what it became" }`. I apply the PATCHes and
verify by fresh re-GET — you do NOT touch the GitHub API and you do NOT need a token.
Append your own progress to `scratchpad/cwk036-plan.md` as you go so a dead window
loses nothing.

## CANARY LAW (§8c)
A canary blocking your exit with findings: FIX THEM IN THAT TURN. Do not route the ask
up — an ask travels up only for an OWNER press. Then RE-STATE YOUR COMPLETE RETURN as
your new final message.

## Return (short)
tags done (exact) · tags NOT reached (exact) · defect classes you actually hit · anything
you REFUSED and why · pending decisions, silence is not "none" · headroom.
