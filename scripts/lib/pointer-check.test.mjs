// CWK-075 — pointer gate unit tests. Zero-dep, node:test only (scripts-quality.md
// section 2). The WIRING is proven separately in render.test.mjs: a module can be fully
// non-vacuous while its verify.mjs block is dead, which this room has now paid for three
// times, so a unit suite alone is never the proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPointers, pointerCandidates, PENDING_POINTERS } from './pointer-check.mjs';

const NL = String.fromCharCode(10);
// A resolver standing in for git + the filesystem. Each fixture names its own tree, so no
// test depends on the live repo's layout.
const resolverFor = (tracked = [], untracked = []) => (p) =>
  tracked.includes(p) ? 'tracked' : untracked.includes(p) ? 'untracked' : 'missing';

const base = {
  ourRoots: new Set(['scripts', 'skills', 'scratchpad']),
  ignoredRoots: new Set(['scratchpad']),
  pending: [],
};

test('candidate extraction drops every class the measured funnel drops', () => {
  const text = [
    'a command: `node scripts/install.mjs cursor`',        // whitespace
    'a template: `plugin/skills/<name>/SKILL.md`',          // <placeholder>
    'a glob: `skills/*/SKILL.md`',                          // glob metachar
    'a bare filename: `package-lock.json`',                 // the USER's repo, no dir
    'absolute: `/etc/hosts` and home: `~/.claude/x.json`',  // outside this repo
    'a url: `https://example.invalid/a/b.md`',              // outside this repo
    'an agent home: `.cursor/skills/`',                     // dot-dir
    'a real one: `scripts/lib/render.mjs`',
  ].join(NL);
  assert.deepEqual(pointerCandidates(text), ['scripts/lib/render.mjs']);
});

test('a fenced code block is an EXAMPLE, not a claim about this tree', () => {
  const text = ['```', 'see `scripts/lib/ghost.mjs`', '```', 'and `scripts/lib/real.mjs`'].join(NL);
  assert.deepEqual(pointerCandidates(text), ['scripts/lib/real.mjs']);
});

test('a path that resolves to a TRACKED file is clean', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'README.md', text: 'see `scripts/lib/render.mjs`' }],
    resolve: resolverFor(['scripts/lib/render.mjs']),
  });
  assert.deepEqual(f.filter((x) => x.level !== 'SKIP'), []);
  assert.equal(f.checked, 1);
});

test('a path that does not resolve at all FAILs and is named', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'README.md', text: 'see `scripts/lib/ghost.mjs`' }],
    resolve: resolverFor([]),
  });
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'FAIL');
  assert.match(f[0].msg, /scripts\/lib\/ghost\.mjs/);
});

test('EXISTS BUT UNTRACKED is a FAIL with its own message -- a clone does not have it', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'README.md', text: 'see `scripts/probe.mjs`' }],
    resolve: resolverFor([], ['scripts/probe.mjs']),
  });
  assert.equal(f.length, 1);
  assert.match(f[0].msg, /UNTRACKED/);
});

test('a citation under a GITIGNORED root FAILs without ever resolving it', () => {
  // The sharp case, and the chair's ruling in one assertion: from any other machine
  // "gitignored" and "does not exist" are indistinguishable, so the file being right
  // there on this disk changes nothing.
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'CONTRIBUTING.md', text: 'full record: `scratchpad/dispatch/x.md`' }],
    resolve: resolverFor([], ['scratchpad/dispatch/x.md']),
  });
  assert.equal(f.length, 1);
  assert.match(f[0].msg, /gitignored/);
});

test('historyOnly skips ordinary resolution but STILL fails a gitignored citation', () => {
  // Published history is never fixed forward -- a renamed file was a correct citation on
  // the day it was written. A scratchpad path never was, on any day.
  const f = checkPointers({
    ...base,
    surfaces: [{
      label: 'CHANGELOG.md',
      historyOnly: true,
      text: 'moved `scripts/old-name.mjs` -- record: `scratchpad/dispatch/y.md`',
    }],
    resolve: resolverFor([]),
  });
  assert.equal(f.length, 1, 'the renamed file must NOT fire');
  assert.match(f[0].msg, /scratchpad\/dispatch\/y\.md/);
  assert.equal(f.checked, 1, 'and the history surface contributes only its gitignored citation');
});

test('a first segment outside this repo is not this repo to be wrong about', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'README.md', text: 'upstream `actions/runner/src/Foo.cs` and `TheColliery/AGENTS.md`' }],
    resolve: resolverFor([]),
  });
  assert.deepEqual(f.filter((x) => x.level !== 'SKIP'), []);
  assert.equal(f.checked, 0);
});

test('a :LINE suffix and a trailing slash are punctuation, not part of the path', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'SECURITY.md', text: 'at `scripts/verify.mjs:158` in `scripts/lib/`' }],
    resolve: resolverFor(['scripts/verify.mjs', 'scripts/lib']),
  });
  assert.deepEqual(f.filter((x) => x.level !== 'SKIP'), []);
  assert.equal(f.checked, 2);
});

test('an unreadable surface is a NAMED skip, never a silent narrowing', () => {
  const f = checkPointers({
    ...base,
    surfaces: [{ label: 'gone.md', text: null }],
    resolve: resolverFor([]),
  });
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'SKIP');
  assert.match(f[0].msg, /gone\.md/);
});

test('no resolve() is a FAIL, never a silent pass -- the gate cannot answer its own question', () => {
  const f = checkPointers({ ...base, surfaces: [{ label: 'x.md', text: '`scripts/a.mjs`' }] });
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'FAIL');
});

test('PENDING_POINTERS suppresses a declared forward pointer', () => {
  const f = checkPointers({
    ...base,
    pending: [{ path: 'scripts/lib/later.mjs', reason: 'CWK-000 lands next unit' }],
    surfaces: [{ label: 'README.md', text: 'see `scripts/lib/later.mjs`' }],
    resolve: resolverFor([]),
  });
  assert.deepEqual(f.filter((x) => x.level !== 'SKIP'), []);
});

test('PENDING_POINTERS expires on the EVENT, both directions', () => {
  // now-resolves -> delete the entry
  const a = checkPointers({
    ...base,
    pending: [{ path: 'scripts/lib/later.mjs', reason: 'r' }],
    surfaces: [{ label: 'README.md', text: 'see `scripts/lib/later.mjs`' }],
    resolve: resolverFor(['scripts/lib/later.mjs']),
  });
  assert.equal(a.length, 1);
  assert.match(a[0].msg, /now resolves/);
  // nobody cites it -> delete the entry
  const b = checkPointers({
    ...base,
    pending: [{ path: 'scripts/lib/later.mjs', reason: 'r' }],
    surfaces: [{ label: 'README.md', text: 'nothing here' }],
    resolve: resolverFor([]),
  });
  assert.equal(b.length, 1);
  assert.match(b[0].msg, /no in-scope surface cites it/);
});

test('a PENDING_POINTERS entry with no reason is a bypass with no author', () => {
  const f = checkPointers({
    ...base,
    pending: [{ path: 'scripts/lib/later.mjs' }],
    surfaces: [{ label: 'README.md', text: 'see `scripts/lib/later.mjs`' }],
    resolve: resolverFor([]),
  });
  assert.ok(f.some((x) => /no reason/.test(x.msg)));
});

test('the shipped PENDING_POINTERS list is EMPTY, and that is a measurement', () => {
  // 52 of 52 in-scope pointers resolved when this gate was built, so nothing needed a
  // declaration. If this ever grows, the entries themselves carry the reason.
  assert.deepEqual(PENDING_POINTERS, []);
});
