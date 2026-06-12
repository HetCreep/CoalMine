# CoalMine Design Principles — the Quantum Computer Spec

Eleven binding principles. Every skill, hook, script, and doc in this repo must satisfy all eleven; every change is judged against them. Principles 1–5 describe **what the machine is**; 6–10 describe **the disciplines that keep it that way**; 11 describes **where its power comes from**.

| # | Principle | Meaning here |
|---|---|---|
| 1 | **Maximum performance** | Detection depth and accuracy are uniform across all 9 canaries, all tiers, all platforms. Per-stack procedures live in `references/`; tier behavior is rubric-driven, never mood-driven. |
| 2 | **Zero visible errors** | Bugs die before users see them: unit + integration tests and the two-direction verify gate run on every commit and push; the suite scans its own code (rot-canary on CoalMine itself). |
| 3 | **Single brand, single color, single company** | Total internal consistency — one naming pattern, one section structure, one voice, and exactly one source of truth for every fact (render core, TARGETS, manifest, shared partials). No two definitions of the same thing. |
| 4 | **Minimum necessary power** | Tokens are spent only when and where needed: lean always-loaded surfaces (descriptions, shared block), progressive disclosure (`references/` load only during a scan), tiers that scale cost to scope. |
| 5 | **Only essential accessories** | Every auxiliary file must earn its place. Anything unused, duplicated, or decorative is removed — an accessory that ships is an accessory someone must maintain and trust. |
| 6 | **Error correction, not error avoidance** | Failures are assumed and recovered automatically: checkpoint → fix → test → auto-revert; manifest-driven clean installs; unknown state re-nudges instead of being swallowed; dead runs resume from recorded results. |
| 7 | **Determinism** | Same input, same answer — tier rubric scores, reproducible builds (`build-plugin.mjs` byte-stable), deterministic hooks. Judgment is reserved for the model layer; everything mechanical is mechanical. |
| 8 | **Isolation** | No side effects across components: hooks never spawn, never touch the network, write only inside their sandbox; one skill's run never contaminates another's state. (Enforced in depth by the Phoenix 13 Commandments for the hook layer.) |
| 9 | **Measurement & calibration** | What is not measured cannot improve: field reports flow in through the issue funnel, usage is measured locally, and behavior is calibrated per project and per platform — never assumed. |
| 10 | **A machine you can trust** | It never harms its owner (path-escape hardening, no secrets, signed releases, SECURITY.md) and its manual never lies — docs state exactly what the code does, verified against the code. |
| 11 | **Entanglement** | The suite's power exceeds the sum of nine independent scanners: canaries hand findings to each other (a leak found here triggers the right specialist there), and shared layers — triggers, gates, rubric, language policy — bind them into one machine. |

Relationship to other rule layers: the [Phoenix 13 Commandments](.claude/rules/ecc/domain/hooks-safety.md) implement principles 6–8 and 10 for hooks; [scripts-quality](.claude/rules/ecc/domain/scripts-quality.md) implements 2 and 6 for CLI scripts; this file governs everything.
