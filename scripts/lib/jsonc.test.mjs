// Unit tests for scripts/lib/jsonc.mjs — the JSONC comment stripper.
// Zero-dep (node:test + built-ins), per scripts-quality.md section 2.
// Guards CoalMine #12: a value ending in a literal backslash used to leak escape
// state into the next token, mis-stripping a later //-containing string so
// JSON.parse threw and the catch silently reverted the config (DATA LOSS in the
// configure.mjs write path). Each case below pairs stripJsonc with JSON.parse —
// the contract the callers depend on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripJsonc } from './jsonc.mjs';

test('backslash-terminated value before a // string parses and preserves both strings (the bug)', () => {
  const input = '{"p":"C:\\\\","x":"a//b"}';
  const parsed = JSON.parse(stripJsonc(input));
  assert.equal(parsed.p, 'C:\\', 'a value ending in a literal backslash survives intact');
  assert.equal(parsed.x, 'a//b', 'the later //-containing string is NOT mis-stripped');
});

test('escaped quote inside a string is preserved', () => {
  const input = '{"q":"he said \\"hi\\""}';
  const parsed = JSON.parse(stripJsonc(input));
  assert.equal(parsed.q, 'he said "hi"');
});

test('a real // line comment and a /* */ block comment after a string are stripped', () => {
  const input = [
    '{',
    '  "a": "keep", // line comment',
    '  "b": "keep2" /* block comment */',
    '}',
  ].join('\n');
  const parsed = JSON.parse(stripJsonc(input));
  assert.deepEqual(parsed, { a: 'keep', b: 'keep2' });
});

test('// inside a string is preserved (not treated as a comment)', () => {
  const input = '{"url":"http://example.com"}';
  const parsed = JSON.parse(stripJsonc(input));
  assert.equal(parsed.url, 'http://example.com');
});
