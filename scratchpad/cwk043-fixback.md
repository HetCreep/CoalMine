DISPATCH — CWK-043 FINDINGS-BACK. You are CoalMine's coder. Same unit, security class.
INSPECT verdict FIX-NEEDED: `.claude/agent-memory/code-reviewer/INSPECT-cwk043.md` (269
lines) — read it yourself, it carries the evidence; this is the routing, not a retelling.

Your query reading was CONFIRMED independently (the reviewer re-derived `isSecureMode` as
`mode & 0o77 == 0` arithmetic, and confirmed `getMode()` is `getOptionArgument(2,"mode")`
— exactly where our `{flag:'wx', mode:0o600}` sits). Every exclusion you stated was
verified correct at source. Two things to close.

## M1 (MEDIUM) — the real one, and it is MY reasoning's gap, not a scanner question
`hooks/rot-canary-touch.js:566` (`.touched`) and `:604` (`.smells`) are flat
`os.tmpdir()` writes at DEFAULT mode, in the SAME directory as the `.memmoved` you just
hardened — and unlike the empty stamp, **they carry content**: the user's edited file
paths, and the smell findings against them.

You excluded them because `appendFileSync` is not among the rule's 14 sinks. That is
correct about the SCANNER and wrong about the THREAT. Our own entry argues the fix on
defense-in-depth for a pre-created world-writable `<tmp>` — an argument that applies with
MORE force to a file containing the user's paths than to a zero-byte stamp. Letting a
scanner's sink list define our threat boundary is the tail wagging the dog, and it makes
the entry's own headline ("every `os.tmpdir()` write") false as written.

`appendFileSync` accepts `mode`. **Harden both, and keep the headline true** — that is my
ruling; the alternative (narrow the headline, leave them) is the honest fallback only if
you find hardening them breaks something real. If it does, say so and take the fallback.
Note `mode` on append applies at CREATE only — that is fine and worth a word in the
comment, not a blocker.

## M2 (MEDIUM) — ship-text precision, my wording to fix
The entry calls `0o600` "the rule's own remediation." It is not: the query's qhelp
recommends a library like `tmp`, which Phoenix #2 forbids us. What `0o600` actually is:
**the exact security property the sink predicate encodes** (`mode & 0o77 == 0`). Reword to
that. The threat argument carries this fix on its own merits — it does not need borrowed
authority from a recommendation we deliberately do not follow.

Also fold in the reviewer's L2: the two `openSync(...,'r')` exclusions are right, but what
saves them is the **absent tmpdir source**, not "read-only" — state the true reason.

## Rails
- Same batch: source + `plugin/` twins, dist rebuilt, all three gates, real `.githooks`.
- Keep `flag: 'wx'` everywhere it already is. Do not trade O_EXCL for a mode.
- Do NOT bump/tag/push — my press.
- CANARY LAW (§8c): canary blocks your exit with findings → fix them in that turn → then
  RE-STATE YOUR COMPLETE RETURN as your new final message.

## Return
commit SHA · what you hardened vs narrowed and why · gates · anything you REFUSED with the
reason · pending decisions, silence is not "none" · headroom.
