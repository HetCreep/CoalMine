# CoalMine Eval Results — rot-canary

**Run:** 2026-06-12-claude-fable-5.json · **Model:** claude-fable-5 · **Date:** 2026-06-12 · **Skill version:** 3.4.0

| Metric | Value |
|---|---|
| Recall (planted defects found) | **100%** (13/13) |
| Precision | **100%** (13 true / 0 false) |
| False positives on clean decoys | **0/4 decoys** |
| Severity accuracy (among matches) | 100% (13/13) |

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
