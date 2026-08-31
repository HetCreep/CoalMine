DISPATCH — CWK-043 BUILD. You are CoalMine's coder. SECURITY CLASS, strong tier, never
delegated down. Room cwd is your repo.

## The alerts
CodeQL #66/#67, HIGH, `js/insecure-temporary-file`, raised on the scan AFTER v3.18.2:
`hooks/rot-canary-stop.js:441` and its byte-identical `plugin/` twin. Line 441 is
`fs.writeFileSync(stamp, '', { flag: 'wx' });` — i.e. OUR OWN U8 hardening fix.

## What I already source-grounded — VERIFY IT, do not inherit it
I read the query's own definition (github/codeql
`javascript/ql/lib/semmle/javascript/security/dataflow/InsecureTemporaryFileCustomizations.qll`):
the sink is `InsecureFileOpen`, and a temp-dir write is flagged when **no `mode` argument is
given, OR the mode's lowest 6 bits are not all 0**. `writeFileSync` is one of its 14 named
sinks. **It does NOT read the `flag` (`wx`/O_EXCL), does NOT read the enclosing directory's
0o700 mode, does NOT read our lstat guards, and does NOT analyze filename randomness.**
Re-derive this yourself before you build on it — if I read the query wrong, say so and stop.

Consequence, and it is the whole ticket: a random filename suffix (the fix that was
proposed to me) would **not** close these alerts, because randomness is not what the rule
reads. The remediation the rule actually asks for is an explicit restrictive `mode`.

## The fix
Pass an explicit `mode: 0o600` to that `writeFileSync`. Keep `flag: 'wx'` — it is doing
real work (O_EXCL refuses a pre-planted name, symlink or not) and is not what was flagged.

**This is NOT purely alert-appeasement, and say so in the comment:** our own code comment
four lines above already admits the residual that `mkdirSync`'s `mode` is a no-op when the
dir already exists, so a third party pre-creating `<tmp>/coalmine/` world-writable leaves
the dir permissive. In exactly that case the stamp's own default mode (0o666 & ~umask) is
what stands between the file and another user. `mode: 0o600` is real defense-in-depth for
the one residual we had already named and accepted.

## SWEEP — one flock, one color, same batch
The rule flags ALL of these sinks: open/openSync/writeFile/writeFileSync/writeJson*/
outputJson*/outputFile*. Check every temp-dir write we ship for the same missing-mode
shape and fix them in THIS batch (a fix applied to one site and not its twins is the
propagate-miss class this room keeps paying for). Candidate sites, verify each yourself
rather than trusting my list:
- `hooks/coalmine-conductor.js:365` (update-check stamp), `:582` (`wx` marker)
- `hooks/rot-canary-stop.js:441` (the flagged one), `:795`
- `hooks/rot-canary-touch.js:549` (`wx`), `:562`, `:600` (appendFileSync)
Judge each: is it in an os-temp path? does it lack a mode? `appendFileSync` is not in the
rule's sink list — say so rather than changing it for symmetry. **Do not widen the diff
beyond temp-dir writes.**

Also check the PowerShell twins under `alt/powershell/` for the same shape, and if PS
cannot express the equivalent, NAME the divergence where it lives rather than porting.

## Rails
- Rebuild the `plugin/` dist (`build-plugin.mjs`) — the twin alert #67 is the dist copy,
  and a source-only fix leaves half the flagged surface untouched.
- Gates: `node scripts/test.mjs`, `node scripts/verify.mjs`, `node scripts/consistency.mjs`.
  If you add a test, prove it RED first against the unfixed file and say you watched it.
- `scripts-quality.md` §3: ask "does the shipped dist change?" BEFORE the SemVer question.
  It does here. Write the CHANGELOG entry; do NOT bump/tag/push — that is my press.
- Commit through the real `.githooks` gate, never `--no-verify`.
- CANARY LAW (§8c): a canary blocking your exit with findings — FIX THEM IN THAT TURN, do
  not route the ask up (an ask travels up only for an OWNER press) — then RE-STATE YOUR
  COMPLETE RETURN as your new final message.

## Return
Whether you confirm or refute my reading of the query · the commit SHA · every site you
changed and every site you deliberately did NOT change with the reason · gate results ·
pending decisions, silence is not "none" · headroom.
