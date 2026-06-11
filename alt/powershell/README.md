# PowerShell hooks (fallback — for setups without Node.js)

The plugin's **default** hooks are cross-platform Node scripts in [`../../hooks/`](../../hooks/) and activate automatically when you install the plugin — that's the recommended path.

These PowerShell versions are a **fallback** for Windows setups that don't have Node.js on `PATH` (e.g. the native installer of Claude Code without Node). Same trigger semantics and temp-file scheme, wired **manually** via your own `settings.json`. Known difference: the stop-hook nudge is **English-only** here, while the Node version localizes to th/ja/zh/es.

## What they do

| Hook | Event | Behavior |
|---|---|---|
| `rotcanary-touch.ps1` | `PostToolUse` (Write/Edit/MultiEdit) | Records the code files touched this session to a per-session temp marker; flags unambiguous tripwires (merge-conflict markers, >800-line files). Always exits 0 (non-blocking). |
| `rotcanary-stop.ps1` | `Stop` | At a natural stop, if code was edited this session, asks the agent to run the code-health scan at `DEPTH=QUICK` on the touched files. **Loop-guarded** (`stop_hook_active`), **one-shot per edit-batch** (a `.scanned` marker), and **kill-switchable**. |

## Manual install (Windows, no Node)

1. Copy both `.ps1` files to `~/.claude/hooks/` (or any path you like).
2. Merge [`settings.snippet.json`](settings.snippet.json) into `~/.claude/settings.json` under `hooks` — replace `<HOME>` with your home path (e.g. `C:\Users\you`). Keep any hooks you already have.
3. Restart your Claude Code session (hooks load at session start).

> If you have Node, ignore this folder — just install the plugin (see the root README) and the Node hooks handle everything with no manual wiring.

## Modes — auto / manual / off

Set `~/.claude/.rotcanary-mode` to one word — these PowerShell hooks honor it just like the Node hooks:

- **auto** (default, or absent) — tripwire records edits + the `Stop` hook runs the audit at session end.
- **manual** — tripwire still records touched files, but the `Stop` hook does **not** auto-run; you run the audit yourself.
- **off** — silent (tripwire records nothing, no auto-run).

Back-compat: `~/.claude/.rotcanary-off` (any contents) forces **off**.

## How the loop guard works

The `Stop` hook would re-fire after the agent finishes the scan it requested. It avoids an infinite loop by:
- bailing when `stop_hook_active` is true (the stop is already a continuation), and
- writing a `.scanned` marker; it only re-nudges when the `.touched` marker is newer (i.e. new edits happened since the last scan).

## Cleanup (Phoenix #1 — zero garbage)

Once a batch is acknowledged (next stop with no new edits), the hook deletes the session's `.touched`/`.smells`/`.scanned` files. On every stop it also sweeps `rotcanary-*` temp files older than 7 days, so sessions killed mid-way can't leak state forever.
