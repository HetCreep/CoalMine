#!/usr/bin/env node
// CoalMine eval scorer — antivirus-style detection-rate measurement.
//
// Compares an agent run's findings against the planted ground truth in
// eval/fixtures/<suite>/<fixture>/expected.json and writes eval/RESULTS.md.
//
// A finding matches a ground-truth entry when fixture + file + category agree
// and the reported line is within ±3 of the planted line. Severity is scored
// separately (accuracy among matched findings). Any finding on a decoy
// (expected.findings = []) — or unmatched anywhere — counts as a false positive.
//
// Usage:
//   node eval/score.mjs [eval/results/<run>.json]   (default: newest in eval/results/)
// Fail-loud CLI per docs/scripts-quality.md: bad inputs exit 1.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(repo, 'eval', 'fixtures', 'rot-canary');
const RESULTS_DIR = path.join(repo, 'eval', 'results');
const LINE_TOLERANCE = 3;

function die(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// ── load ground truth ────────────────────────────────────────────────────────
if (!fs.existsSync(FIXTURES)) die(`no fixtures at ${FIXTURES}`);
const fixtures = fs.readdirSync(FIXTURES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
if (!fixtures.length) die('fixture suite is empty');

const expected = {};
for (const f of fixtures) {
  const p = path.join(FIXTURES, f, 'expected.json');
  if (!fs.existsSync(p)) die(`${f}: expected.json missing`);
  try {
    expected[f] = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')).findings ?? [];
  } catch (e) {
    die(`${f}: expected.json unreadable: ${e.message}`);
  }
}

// ── load the run ─────────────────────────────────────────────────────────────
let runPath = process.argv[2];
if (!runPath) {
  if (!fs.existsSync(RESULTS_DIR)) die(`no results dir at ${RESULTS_DIR} — pass a run file`);
  const runs = fs.readdirSync(RESULTS_DIR).filter((x) => x.endsWith('.json')).sort();
  if (!runs.length) die('no run files in eval/results/');
  runPath = path.join(RESULTS_DIR, runs[runs.length - 1]);
}
let run;
try {
  run = JSON.parse(fs.readFileSync(runPath, 'utf8').replace(/^\uFEFF/, ''));
} catch (e) {
  die(`run file unreadable: ${e.message}`);
}
if (!Array.isArray(run.findings)) die('run file has no findings[]');

// ── match ────────────────────────────────────────────────────────────────────
const perCategory = {}; // cat → { tp, fn }
const cat = (c) => (perCategory[c] ??= { tp: 0, fn: 0 });
let tp = 0, fn = 0, fp = 0, severityHits = 0;
let decoyFp = 0;
const fpList = [], fnList = [];

const pool = run.findings.map((x) => ({ ...x, used: false }));
for (const f of fixtures) {
  const isDecoy = expected[f].length === 0;
  for (const want of expected[f]) {
    const hit = pool.find((g) =>
      !g.used && g.fixture === f && g.file === want.file &&
      g.category === want.category && Math.abs((g.line ?? 0) - want.line) <= LINE_TOLERANCE);
    if (hit) {
      hit.used = true;
      tp++; cat(want.category).tp++;
      if (hit.severity === want.severity) severityHits++;
    } else {
      fn++; cat(want.category).fn++;
      fnList.push(`${f} ${want.file}:${want.line} ${want.category}`);
    }
  }
  for (const g of pool.filter((g) => g.fixture === f && !g.used)) {
    g.used = true;
    fp++;
    if (isDecoy) decoyFp++;
    fpList.push(`${f} ${g.file}:${g.line} ${g.category}`);
  }
}

const pct = (a, b) => (b === 0 ? '—' : `${Math.round((a / b) * 100)}%`);
const recall = pct(tp, tp + fn);
const precision = pct(tp, tp + fp);
const sevAcc = pct(severityHits, tp);
const decoys = fixtures.filter((f) => expected[f].length === 0).length;

// ── report ───────────────────────────────────────────────────────────────────
const lines = [];
lines.push('# CoalMine Eval Results — rot-canary');
lines.push('');
lines.push(`**Run:** ${path.basename(runPath)} · **Model:** ${run.model ?? 'unknown'} · **Date:** ${run.date ?? 'unknown'} · **Skill version:** ${run.skillVersion ?? 'unknown'}`);
lines.push('');
lines.push('| Metric | Value |');
lines.push('|---|---|');
lines.push(`| Recall (planted defects found) | **${recall}** (${tp}/${tp + fn}) |`);
lines.push(`| Precision | **${precision}** (${tp} true / ${fp} false) |`);
lines.push(`| False positives on clean decoys | **${decoyFp}/${decoys} decoys** |`);
lines.push(`| Severity accuracy (among matches) | ${sevAcc} (${severityHits}/${tp}) |`);
lines.push('');
lines.push('## Per category');
lines.push('');
lines.push('| Category | Found | Planted | Recall |');
lines.push('|---|---|---|---|');
for (const [c, v] of Object.entries(perCategory).sort()) {
  lines.push(`| ${c} | ${v.tp} | ${v.tp + v.fn} | ${pct(v.tp, v.tp + v.fn)} |`);
}
if (fnList.length) {
  lines.push('', '## Missed (false negatives)', '', ...fnList.map((x) => `- ${x}`));
}
if (fpList.length) {
  lines.push('', '## False positives', '', ...fpList.map((x) => `- ${x}`));
}
lines.push('');
lines.push('## Methodology');
lines.push('');
lines.push(`${fixtures.length} fixtures (${fixtures.length - decoys} with planted, line-labeled defects · ${decoys} clean decoys). The agent runs rot-canary QUICK over each fixture and emits structured findings; this scorer matches them mechanically (fixture + file + category, line ±${LINE_TOLERANCE}) — no judgment calls at scoring time. Results are model-dependent, like antivirus detection rates are engine-dependent: re-run on model or skill changes and compare. Caveat for this baseline: fixtures and the first run were authored in the same project — treat the numbers as a regression floor, not an independent benchmark.`);
lines.push('');

fs.writeFileSync(path.join(repo, 'eval', 'RESULTS.md'), lines.join('\n'));
console.log(lines.slice(2, 12).join('\n'));
console.log(`\nWrote eval/RESULTS.md`);
// Exit 0 even with misses/false-positives — the scorer is informational; the
// numbers in RESULTS.md are the judgment, not the exit code.
