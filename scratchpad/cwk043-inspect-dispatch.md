DISPATCH — CWK-043 INSPECT. You are CoalMine's code-reviewer. SECURITY class. Read-only.

Two local unpushed commits: `bfd0d0a` (the fix) → `2621a30` (canary findings on its own
diff). Subject = both, as one unit.

## What is being ruled, and why it is not routine
CodeQL #66/#67 (HIGH, `js/insecure-temporary-file`) fired on `rot-canary-stop.js:441` —
**our own U8 hardening fix from v3.18.2.** I was handed a hypothesis that this is a
false positive by hardening, remediable with a random filename suffix. I read the query's
own source instead and ruled the hypothesis WRONG on mechanism: the sink is
`InsecureFileOpen`, which fires on **a missing `mode` argument, or a mode whose lowest 6
bits are not 0** — it never reads the `flag` (`wx`), the 0o700 dir, our lstat guards, or
filename randomness. So a random suffix would not have closed anything, and the alert is a
real (low-impact) gap: the stamp was created at default mode inside a directory whose own
0o700 is a no-op when it already exists — a residual our own comment already admitted.

The coder independently CONFIRMED that reading at source. **Attack it anyway** — if we are
both wrong about the query's semantics, the whole ruling collapses and everything below is
built on it.

## Attack these specifically
1. **Is `mode: 0o600` actually the rule's own remediation, or are we appeasing a scanner?**
   If it is appeasement, say so — I would rather dismiss honestly than ship a placebo.
2. **Completeness of the sweep.** 4 temp-dir sites changed (`stop.js` sweep stamp + the
   `.scanned` marker, `conductor.js` AG session marker, `touch.js` `.memmoved`), plus the
   `plugin/` twins. Sites deliberately NOT changed, each with a stated reason:
   `conductor.js:365` (homedir, not temp) · `touch.js:562`/`:600` (`appendFileSync`, not in
   the rule's 14 sinks) · `stop.js:29`/`touch.js:569` (`openSync(...,'r')`, read-only,
   project paths). **Verify every exclusion at source.** A missed twin is this room's
   dominant recurring defect class.
3. **Does `flag: 'wx'` still do its job?** It must be preserved everywhere — it is what
   refuses a pre-planted name. A fix that traded O_EXCL for a mode would be a regression
   wearing a green alert.
4. **The declared test gap.** The coder states the `0o600` assertion SKIPS on this box
   (NTFS reports 666 either way, so red-first was not watchable here) and only exercises on
   the Unix CI legs. Is that honestly scoped and visibly skipped, or a vacuous pass in
   disguise? This room has shipped that exact false-green before.
5. **`2621a30`'s own content:** an 833-line over-run DECLARED rather than split, justified
   by the copy-one-file shipping model. Is that justification true at source
   (`build-plugin.mjs` inlining, `hooks.json` invocation), or a convenient story?
6. Dist parity source↔`plugin/` for every touched hook.

## Rails
- Read-only. Do not edit, do not push, no token needed.
- Verdict SHIP or FIX-NEEDED, findings named file:line. Findings bounce to the MAKER —
  code findings to the coder, findings against MY RULING to me.
- Write the verdict to `.claude/agent-memory/code-reviewer/INSPECT-cwk043.md`, then return
  a short summary pointing at it.
- CANARY LAW (§8c): a canary blocking your exit with findings — FIX THEM IN THAT TURN, do
  not route the ask up (an ask travels up only for an OWNER press) — then RE-STATE YOUR
  COMPLETE RETURN as your new final message.
- Pending decisions: silence is not "none".
