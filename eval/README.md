# CoalMine Eval Harness

Antivirus-style detection-rate measurement for the canaries — the same idea as
AV-Comparatives: a corpus of **planted, labeled defects** plus **clean decoys**,
scored mechanically.

```
eval/
  fixtures/rot-canary/
    f01-dead-code/ … f12-doc-rot/   ← tiny code samples, each with expected.json
                                       (ground truth: file, line, category, severity)
    d01-…-d04-clean-decoy/          ← zero-defect files; any finding = false positive
  results/<date>-<model>.json       ← one agent run: structured findings
  score.mjs                         ← mechanical matcher → RESULTS.md
  RESULTS.md                        ← latest scored run
```

## Running an eval

1. Have your agent run the **rot-canary** skill (DEPTH=QUICK) over each fixture
   directory, recording findings as
   `{ fixture, file, line, category, severity }`.
   Categories: `dead-code · bug-prone · resource-leak · concurrency ·
   silent-failure · input-boundary · doc-rot`.
2. Save the run as `eval/results/<YYYY-MM-DD>-<model>.json`:
   `{ "model": "...", "date": "...", "skillVersion": "...", "findings": [...] }`
3. Score it: `node eval/score.mjs` (newest run by default).

A match = same fixture + file + category, line within ±3. Severity is scored
separately. Findings on decoys are false positives.

## Why

"Antivirus-grade quality" needs a number, not an adjective. Results are
model-dependent — like AV detection rates are engine-dependent — so every run
records the model and skill version, and re-running after a skill or model
change shows regressions mechanically.
