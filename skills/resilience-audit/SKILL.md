---
name: resilience-audit
description: Resilience / failure-mode audit (FMEA for software) — for each way the system can fail (network, storage, partial completion, crash, concurrency, bad input, dependency-down, resource exhaustion), check whether the code DETECTS, HANDLES, RECOVERS, and COMMUNICATES it. Flags data loss, corruption, silent-success-on-partial-failure, unrecoverable state, and missing retry / rollback / idempotency / atomicity. Use before shipping risky I/O or state-mutating code, or for a periodic robustness review. Reports; does not fix unless asked.
---

# Resilience Audit

Ask of every operation: **"what happens when this FAILS?"** Walk each failure point and check the code detects it, handles it, recovers cleanly, and tells someone — instead of corrupting data, hanging, or reporting false success. Report; do NOT fix unless asked.

## Input (infer if not given)
- **PROJECT + the operations that matter** — the I/O, state mutations, external calls, long/destructive operations. Read the code.
- **SCOPE** — whole repo | a subsystem | the risky operation named.
- **DEPTH** — QUICK (the obvious destructive/I-O paths) | DEEP (full FMEA across all categories + untested-path map).

## Failure categories (probe each that applies)
1. **External I/O** — network down / slow / partial · API 4xx/5xx / timeout / rate-limit · DNS · TLS. → retry w/ backoff? timeout set? circuit-break? clear message vs hang?
2. **Storage / filesystem** — disk full · permission denied · file locked · path missing · partial write · concurrent write. → atomic write (temp + rename)? cleanup on failure? no corruption of the existing good copy?
3. **Partial completion** — half-done op (extracted 50/100 files, wrote half a record). → all-or-nothing / rollback / resume? **reported as FAILURE, never success** (install-safety's "partial = failure").
4. **Process / crash** — killed mid-op · power loss · OOM. → idempotent restart? no orphaned half-state? next run recovers?
5. **Concurrency** — two instances · race · deadlock · double-run · lock contention. → locking / idempotency / safe re-entry?
6. **Input / data** — malformed / corrupt / truncated / null / wrong-encoding / huge / empty. → validate at the boundary? fail-fast with a clear error?
7. **Dependency / service down** — a DB / service / external dep unavailable. → fallback / cache / graceful degrade? clear error vs silent hang?
8. **Resource exhaustion** — memory · handles · connections · threads · quota. → bounded? backpressure? cleanup on the error path?
9. **Time / ordering** — clock skew · timeout too short · stale cache · out-of-order events · TOCTOU.
10. **State / rollback** — can a failed op leave the system inconsistent / worse than before? Is there rollback/undo? Is the op idempotent + atomic?

## For each failure point, check 4 things
- **Detected?** does the code notice the failure (not swallow it)?
- **Handled?** retry / fallback / fail-clean — not ignored, not silent-success.
- **Recoverable?** rollback / resume / idempotent retry; no data loss; no corruption.
- **Communicated?** clear error to user + log; not a hang, not a false "done".

## Method — FMEA-lite
1. **Map** the operations + their external touchpoints (I/O, state mutations, destructive steps).
2. For each: **failure mode → effect → current handling (cite file:line) → gap → severity.**
3. **Ordering check (verify-before-touch):** is the risky/destructive step gated behind a *verified* success? Is there a window where a crash between step A and B leaves bad state? (e.g. delete-before-download, write-before-validate.)
4. **Recommend** the missing guard: retry/backoff · timeout · atomic write · rollback · idempotency key · boundary validation · bounded resource.

## Severity
- **CRITICAL** — data loss / corruption / silent-success-on-failure / unrecoverable bad state.
- **HIGH** — crash / hang / partial state with no recovery on a reachable path.
- **MEDIUM** — poor degradation / unclear error / missing retry on a flaky path.
- **LOW** — cosmetic / minor failure-path UX.

## Discipline (non-negotiable)
- **Trace the actual failure path in code** (cite file:line) — don't assume handling exists; prove it (show the catch/retry/rollback, or its absence).
- **"partial = failure":** flag any path that reports success on partial completion.
- **"logged" ≠ "handled":** a swallowed-and-logged error that still corrupts state or returns success is CRITICAL (ties to rotcanary's silent-failure category — but here judged by *effect on state*).
- Distinguish **"can't happen" (prove it)** from **"not handled" (a real gap)**.
- Call out **untested failure paths** — error handling is rarely covered by tests; the scariest gaps hide there.
- Don't fix — report + recommend; changing error/recovery logic needs the user's go.

## Output
1. **FMEA table** — sorted by severity:

   | operation | failure mode | effect | current handling (file:line) | severity | recommended guard |

2. **Ordering / atomicity findings** — destructive steps not gated behind a verified success; crash-windows.
3. **Summary** — counts by severity + the top fixes.
4. **Not assessed** — operations / categories skipped + why (esp. untested failure paths).

## Depth / sub-agents
DEEP on a host with sub-agents: fan out **one failure-category per worker** (I/O · storage · concurrency · partial/crash · resource). Strong model judges data-loss / corruption / rollback correctness; cheap model lists missing timeouts/validation. Synthesize, then an adversarial pass: **"what failure mode did we NOT consider?"** Single-model / no sub-agents → inline.

## Fix mode (opt-in — choice-gated)
Default = **report only** (does not fix unless asked). To act, never auto-edit silently — after the report, **pop a selectable choice** (host choice UI, e.g. AskUserQuestion):
- **Fix safe now** — auto-apply only SAFE / additive / reversible guards: add a missing timeout, add boundary / null / input validation, add a clear error message + log on an unhandled path. Each goes through the harness below.
- **Let me pick** — list the findings; apply only the ones the user selects.
- **Report only** (default) — change nothing.

NEVER in "Fix safe now" (needs an explicit pick): changing **retry / rollback / recovery / atomicity logic**, or restructuring an operation — semantic changes can introduce *new* failure modes (the very thing this audit guards against). These get proposed, picked, then verified — never blind-applied.

**Safety harness — every applied fix:**
1. **Checkpoint first** — make a restore point before touching anything (git branch or commit; `git stash` if the tree is dirty). **No git / no restore point possible → do NOT auto-apply** (report-only, or one fix then stop for explicit confirm) — never run the verify-loop without a way to revert. If any harness step itself fails (build won't run, revert fails) → **stop the whole run, restore the checkpoint, and report** — don't keep applying.
2. **One fix → re-run** the build + the tests that cover it (incl. the failure-path test if one exists).
3. **Verify-loop** — green ⇒ keep · red ⇒ **auto-revert that fix** and downgrade it to "report only".
4. **Diff summary** at the end — every change (kept + reverted) with `path:line`.

⚠️ Failure paths are rarely tested (see Discipline) → a guard with no covering test can't be verify-looped. Add the test alongside, or leave the fix to "pick" with an "untested failure path" warning.

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.

## Language
Write the report, all prose, **and every selectable choice / option label you pop** (e.g. the fix-mode or CONFORM menu) in **the user's language** — match whatever language they are conversing in (Thai -> Thai, etc.). Keep code, file paths, identifiers, commands, error text, and technical terms verbatim — never translate those.
