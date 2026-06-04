# rotcanary

A **Claude Code plugin**: a language-agnostic **code-health audit** skill *plus* an auto-cadence so the audit fires by itself — install it and it just works, on Windows, macOS, and Linux, with no `settings.json` editing.

It finds **dead code, unwired/disconnected code, bug-prone logic, duplication, resource leaks, concurrency bugs, silent failures, input-boundary security issues, and doc rot** — and reports them with evidence, a severity rubric, and a verify-before-reporting discipline that kills false positives. It does **not** change your code unless you ask.

## Install (turnkey)

```
/plugin marketplace add HetCreep/rotcanary
/plugin install rotcanary@rotcanary
```

That's it — the skill and both hooks activate automatically. No `settings.json` edits, no path fixing.

> **Requires Node.js on `PATH`** (it ships with the npm install of Claude Code, so most setups already have it). The hooks are cross-platform Node scripts. If you installed Claude Code without Node, see [`alt/powershell/`](alt/powershell/) (Windows) or just run the skill manually.

## What you get

- **Skill** `/rotcanary:scan` — run the audit on demand (params below).
- **Auto-cadence (bundled hooks, zero-action):**
  - **Per edit** (`PostToolUse`) — records the code files you touch this session + flags unambiguous tripwires (merge-conflict markers, >800-line files). Cheap, non-blocking.
  - **Per session-end** (`Stop`) — auto-invokes the skill at `DEPTH=QUICK` on the session's touched files. Loop-guarded and one-shot per edit-batch.

## Usage

On demand:

```
/rotcanary:scan
/rotcanary:scan DEPTH=DEEP SCOPE=src/ STACK=TypeScript
```

- **SCOPE** — whole repo | named files | the git diff. Default: the touched files (from the hook), else the git diff, else asks.
- **DEPTH** — `QUICK` (default, one pass) | `DEEP` (whole-repo, cross-file wiring, loop-until-clean).
- **STACK** — auto-detected.

Output is a severity-sorted findings table with evidence per finding, a separate "SUSPECTED (unverified)" list, and an explicit "what I did NOT cover" — no silent truncation.

## What it checks

Ten categories — correctness/bug-risk, dead & unreachable, disconnected/unwired, duplication, resource & lifecycle, concurrency/async, error handling & silent failure, input-boundary security, performance, doc/comment rot. Full procedure (verify rules, severity, output format, per-stack tooling) is in [`skills/scan/SKILL.md`](skills/scan/SKILL.md).

## Smart execution (sub-agents + model-aware)

On hosts with a sub-agent / parallel-worker system (e.g. Claude Code), a DEEP or whole-repo scan **fans out** — one scanner per category, each assigned to the **cheapest model tier that fits the job**: mechanical checks (dead-code, duplication, doc rot) go to a *fast* model; concurrency, input-boundary security, architectural wiring, and the adversarial verify pass go to a *strong* model; everything else to a *mid* tier. A synthesis pass dedups, then a refute-to-verify pass kills false positives. On single-model or hookless hosts it simply runs inline. Full tier map: [`skills/scan/SKILL.md`](skills/scan/SKILL.md) §5.

## Cadence philosophy

`DEPTH ∝ 1 / FREQUENCY` — shallow + often, deep + rarely:

| Trigger | Frequency | Depth | How |
|---|---|---|---|
| Per edit | continuous | tripwire | bundled hook (auto) |
| Per session-end | per session | QUICK | bundled hook (auto) |
| Per release / merge | per release | QUICK | manual / CI |
| Milestone / ~5 releases | rare | DEEP | manual (`DEPTH=DEEP`) |

## Modes — auto / manual / off

Set the mode with an optional one-word file `~/.claude/.rotcanary-mode`:

| Mode | per-edit tripwire | auto session-end scan | `/rotcanary:scan` on demand | How to set |
|---|---|---|---|---|
| **auto** (default) | ✅ | ✅ | ✅ | absent, or `auto` |
| **manual** | ✅ (records touched files so your manual scan is precise) | ❌ | ✅ | `echo manual > ~/.claude/.rotcanary-mode` |
| **off** | ❌ | ❌ | ✅ | `echo off > ~/.claude/.rotcanary-mode` |

- **auto** — zero-action: edits are tracked, the audit fires at session end.
- **manual** — you drive: nothing fires by itself, but touched files are still tracked so `/rotcanary:scan` knows what changed. Run it when you want (or in CI).
- **off** — fully silent.

Back-compat: the file `~/.claude/.rotcanary-off` (any contents) forces **off**. Return to auto by deleting both files.

## Requirements & platforms

- **Node.js on `PATH`** for the bundled hooks (standard with the npm install of Claude Code).
- Cross-platform: Windows · macOS · Linux.
- **No Node?** PowerShell equivalents are in [`alt/powershell/`](alt/powershell/) (wire them via your own `settings.json`), or skip the hooks and run `/rotcanary:scan` manually.

## Contributing

- A **bash/zsh fallback** for the hooks (for environments without Node) is welcome.
- More stack rows in the tooling table.
- Sharper false-positive heuristics.

## License

MIT — see [LICENSE](LICENSE).
