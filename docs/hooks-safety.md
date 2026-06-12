# Hook Safety and Robustness Rules

<!-- coalmine: verified 2026-06-12 · exemplar Claude Code hooks contract + husky · revalidate 90d -->

This document outlines the design standards for Node.js-based terminal hooks, git hooks, and pre/post-tool execution scripts.

## 1. Exception Isolation & Graceful Fallbacks

- **No Blocking Failures:** All hooks must wrap their core execution logic in try-catch blocks. If a hook fails (e.g., due to file system permission issues or missing dependencies), it must log a warning and exit gracefully with code `0`. It must never cause the parent process (git, CLI, or agent) to fail or abort.
- **Graceful degradation:** If external binaries (e.g., `git`, `node`, or stack-specific compilers) are missing or fail, the script should fallback to reporting mode or a safe default state rather than throwing unhandled exceptions.

## 2. Execution Latency & Performance

- **Fast Execution:** Hooks that run inline during user tasks (e.g., `PostToolUse` or pre-commit hooks) must execute in under 100ms.
- **Lazy Loading:** Avoid importing large packages or executing heavy file-system scans at the top level of scripts. Load resources dynamically only when a scan condition is met.
- **Asynchronous Operations:** Perform file writing or analytics logging asynchronously so as not to block the CLI's main thread.

## 3. Cross-Platform Directory & Shell Handling

- **Path Normalization:** Never hardcode directory separators (`/` or `\`). Always use Node's `path` library.
- **Case-Insensitive Windows Path Checks:** Remember that Windows paths are case-insensitive. When comparing paths on `win32` platform (e.g., checking if a file is already in a list of touched files), normalize them to lowercase to avoid duplicate detections.
- **Shell Escaping:** Properly escape file paths passed to child processes using platform-specific escaping rules (e.g., `cmd.exe` double-quotes vs PowerShell backticks vs bash single-quotes).

## 4. Output Formatting & Verbosity

- **No Log Clutter:** Minimize terminal output during normal operation. Only log warnings or actionable suggestions.
- **Clear Indicators:** Use clean, standard prefixes (e.g., `[CoalMine]`) when logging from hooks so the user understands where the message originated.

## 5. Localization & Adaptive Language

- **Adaptive Language:** Hooks that output user-facing warnings or prompt the user must detect the user's language and adapt dynamically.
- **Heuristic-Based Language Detection:** If the environment context is not passed directly, detect language by scanning project documentation (e.g., `AGENTS.md`, `MEMORY.md`, `README.md`) for regional characters (e.g., Thai Unicode characters `\u0e00-\u0e7f`). If detected, display messages in the local language; otherwise, default to English.

## 6. Phoenix Canary — 13 Commandments

All CoalMine hooks and canary skill scripts must conform to the Phoenix Canary philosophy. A Phoenix Canary is immortal, zero-footprint, and self-sufficient. Each commandment maps to a measurable property:

| # | Commandment (TH) | Principle | Implementation Requirement |
|---|---|---|---|
| 1 | ไม่ขับถ่าย | **Zero Garbage** | Delete every temp file on completion or failure. Use `finally` blocks to guarantee cleanup. |
| 2 | ไม่กินอาหาร | **Zero Dependencies** | Use only Node.js built-in modules (`fs`, `path`, `os`). No `npm install` required to run. |
| 3 | ไม่หายใจ | **Zero Latency** | `PostToolUse` hooks must add ≤5ms of work beyond interpreter startup on the happy path (no file match); total wall-clock ≤100ms including a scan. Node startup itself (~50–80ms) dominates — budget the work, not the process. |
| 4 | ไม่มีทางตาย | **Fail-silent** | Wrap all logic in `try { main(); } catch {}`; never set a non-zero exit code. Let the process exit naturally — do NOT call `process.exit()`, it can truncate pending stdout writes (the Stop hook's JSON nudge). Never crash the parent agent. |
| 5 | ไม่สืบพันธุ์ | **Zero Side-effects** | Never spawn child processes, write to global config, or trigger other hooks as side effects. |
| 6 | ไม่มีตัวตน | **Stateless** | No global state between invocations. Session state lives in temp files scoped by `session_id`, cleaned on stop. |
| 7 | ไม่พึ่งพาใคร | **Offline-capable** | No network calls ever. All lookups must be local filesystem only. |
| 8 | ไม่กลายพันธุ์ | **Deterministic** | Same input → same output, always. No random IDs, no time-based branching outside timestamp stamps. |
| 9 | ไม่จำกัดร่าง | **Portable** | Runs on Windows, macOS, Linux without modification. Use `path.join()`, `os.homedir()`, `os.tmpdir()`. |
| 10 | ไม่ล้ำเส้น | **Sandbox Compliant** | Never read or write outside `os.tmpdir()` (session state) and `os.homedir()/.claude/` (mode config). |
| 11 | ไม่แก่ตัว | **Future-proof** | Use stable Node.js built-ins only. No deprecated APIs. Compatible with Node 18+. |
| 12 | ไม่ต้องการผู้ดูแล | **Self-healing** | On any unexpected state (corrupt temp file, missing session ID), silently skip and return cleanly. |
| 13 | ไม่ส่งเสียง | **Zero Noise** | Hooks output NOTHING to stdout/stderr except the two sanctioned channels: the Stop hook's structured JSON block when an action is required, and SessionStart context injection (conductor). Everything else is silent. |

