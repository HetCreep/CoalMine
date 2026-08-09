import test from 'node:test';
import assert from 'node:assert/strict';
import { trimDescription, CLAUDE_AI_DESC_CAP } from './claude-ai-trim.mjs';

test('CLAUDE_AI_DESC_CAP is 200 (the platform constraint this exists to satisfy)', () => {
  assert.equal(CLAUDE_AI_DESC_CAP, 200);
});

test('a description already under the cap is returned unchanged', () => {
  const d = 'Short description.';
  assert.equal(trimDescription(d), d);
});

test('a description exactly at the cap is returned unchanged (boundary, not over)', () => {
  const d = 'x'.repeat(200);
  assert.equal(trimDescription(d), d);
  assert.equal(trimDescription(d).length, 200);
});

test('a description one char over the cap is trimmed and never exceeds it', () => {
  const d = 'word '.repeat(50); // 250 chars, always word-boundary-safe
  const out = trimDescription(d);
  assert.ok(out.length <= 200, `trimmed length ${out.length} must be <= 200`);
  assert.ok(out.endsWith('...'), 'trimmed output carries the ellipsis');
});

test('trim cuts at the last whitespace boundary, never mid-word', () => {
  const d = 'a'.repeat(150) + ' ' + 'b'.repeat(100); // 251 chars total
  const out = trimDescription(d);
  const withoutEllipsis = out.slice(0, -3);
  assert.ok(!withoutEllipsis.includes('b'), 'the cut lands before the second word, never splitting it');
});

test('deterministic: the same input always produces the same output', () => {
  const d = 'x'.repeat(300);
  assert.equal(trimDescription(d), trimDescription(d));
});

test('a real CoalMine description (rot-canary) trims to <=200 and stays non-empty', () => {
  const real = 'Code-health scan — dead code, bug-prone logic, resource leaks, concurrency bugs, silent failures, input-boundary issues, doc rot. Triggers on: "/rot-canary", "rot-canary", "code-health" (legacy aliases: "/rotcanary", "rotcanary"). Auto-runs at session end on touched files (QUICK, report only) via platform hooks — auto-wired by the Claude Code plugin, manual elsewhere. Run manually for fix mode. Reports; fixes on request via choice-gated menu.';
  assert.ok(real.length > 200, 'fixture must actually exceed the cap to test trimming');
  const out = trimDescription(real);
  assert.ok(out.length <= 200);
  assert.ok(out.length > 0);
});
