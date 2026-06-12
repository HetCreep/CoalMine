# CoalMine Eval Results — rot-canary

**Run:** 2026-06-13-antigravity.json · **Model:** Antigravity · **Date:** 2026-06-13 · **Skill version:** 3.4.0

| Metric | Value |
|---|---|
| Recall (planted defects found) | **100%** (13/13) |
| Precision | **100%** (13 true / 0 false) |
| False positives on clean decoys | **0/4 decoys** |
| Severity accuracy (among matches) | 92% (12/13) |

## Per category

| Category | Found | Planted | Recall |
|---|---|---|---|
| bug-prone | 2 | 2 | 100% |
| concurrency | 2 | 2 | 100% |
| dead-code | 3 | 3 | 100% |
| doc-rot | 1 | 1 | 100% |
| input-boundary | 1 | 1 | 100% |
| resource-leak | 2 | 2 | 100% |
| silent-failure | 2 | 2 | 100% |

## Methodology

16 fixtures (12 with planted, line-labeled defects · 4 clean decoys). The agent runs rot-canary QUICK over each fixture and emits structured findings; this scorer matches them mechanically (fixture + file + category, line ±3) — no judgment calls at scoring time. Results are model-dependent, like antivirus detection rates are engine-dependent: re-run on model or skill changes and compare. Caveat for this baseline: fixtures and the first run were authored in the same project — treat the numbers as a regression floor, not an independent benchmark.

## Cross-engine comparison (13-Jun-2026)

Two independent engines over the same corpus — the Antigravity run was blind (fixtures authored by Claude; expected.json off-limits):

| Engine | Recall | Precision | Decoy FPs | Severity accuracy |
|---|---|---|---|---|
| claude-fable-5 (author baseline) | 13/13 | 100% | 0/4 | 13/13 |
| Antigravity (blind) | 13/13 | 100% | 0/4 | 12/13 |

Sole disagreement: f09-bug-prone (`i <= items.length` walks past the array) — ground truth CRITICAL (TypeError on every non-empty call = crash on the normal path), Antigravity rated HIGH. Detection layer identical; divergence appears exactly in the severity-judgment band, consistent with the cross-model convergence theory. Caveat: this corpus is unambiguous by design — real-world code with murkier rot will diverge more.
