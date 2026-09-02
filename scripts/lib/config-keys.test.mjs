const NEWLINE = String.fromCharCode(10);
const BSN = String.fromCharCode(92) + 'n';
import test from 'node:test';
import assert from 'node:assert';
import { checkConfigKeys, PENDING_KEYS, NOT_CONFIG } from './config-keys.mjs';

// In-memory surfaces: `read` is injected, so these drive the checker with no disk IO.
const mem = (files) => (f) => {
  if (!(f in files)) throw new Error('ENOENT ' + f);
  return files[f];
};
const BASE = ['scanExcludePaths', 'autoScanFileCap'];
// Empty declarations isolate the rule under test from the self-cleaning rules.
const NONE = { pending: {}, notConfig: {} };

test('config-keys: THE DEFECT -- a key named in a doc but absent from the schema FAILs, naming key and file', () => {
  const out = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['skills/x/SKILL.md'],
    read: mem({ 'skills/x/SKILL.md': 'Set `scanEverything` to true.' }),
    ...NONE,
  });
  assert.equal(out.length, 1);
  assert.match(out[0].msg, /scanEverything/);
  assert.match(out[0].msg, /skills\/x\/SKILL\.md/);
  assert.equal(out[0].level, 'FAIL');
});

test('config-keys: a key that DOES resolve is silent', () => {
  const out = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'Narrow `scanExcludePaths` or raise `autoScanFileCap`.' }),
    ...NONE,
  });
  assert.deepEqual(out, []);
});

test('config-keys: CRY-WOLF BOUND -- enum values and lowercase prose words are not candidates', () => {
  // Measured false positives a naive backtick rule produced on this repo: enum values
  // (`off`, `safe`, `interactive`, `true`, `false`) and prose (`file`, `line`, `fs`).
  const out = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'Use `off`, `safe`, `interactive`, `true`, `false`, `file`, `line`, `fs`, `git log`, `--help`.' }),
    ...NONE,
  });
  assert.deepEqual(out, [], 'none of these has an internal capital, so none is a candidate');
});

test('config-keys: a hook is scanned only inside its NOTICE BLOCK, never its whole source', () => {
  const hook = [
    "function loadCfg() { const projectCfg = 1; return projectCfg; }",
    "const TRANSLATIONS = {",
    "  en: { note: 'Set scanEverything to true; skipped per scanExcludePaths.' },",
    "};",
    "const watchedExts = new Set();",
  ].join(NEWLINE);
  const out = checkConfigKeys({
    schemaKeys: BASE,
    hookFiles: ['h.js'],
    read: mem({ 'h.js': hook }),
    ...NONE,
  });
  assert.equal(out.length, 1, 'only the notice-block identifier is a candidate');
  assert.match(out[0].msg, /scanEverything/);
  assert.ok(!out.some((f) => /loadCfg|projectCfg|watchedExts/.test(f.msg)), 'code outside the notice block is never scanned');
});

test('config-keys: an escape sequence does not manufacture a phantom identifier', () => {
  // MEASURED: nReport / nMemory / nTripwires / nAlertas / nInforme -- five languages,
  // one escape, five false positives, before the escape-stripping pass.
  const hook = [
    'const TRANSLATIONS = {',
    "  en: { a: 'line one" + BSN + "Report follows" + BSN + "Memory too' },",
    '};',
  ].join(NEWLINE);
  const out = checkConfigKeys({ schemaKeys: BASE, hookFiles: ['h.js'], read: mem({ 'h.js': hook }), ...NONE });
  assert.deepEqual(out, []);
});

test('config-keys: PENDING_KEYS makes the HONEST case cheap -- a declared planned key is silent', () => {
  const out = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'A `futureKey` override is planned.' }),
    ...NONE,
  });
  assert.equal(out.length, 1, 'undeclared -> FAIL (this is the control)');
  assert.match(out[0].msg, /futureKey/);

  const declared = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'A `futureKey` override is planned.' }),
    pending: { futureKey: 'CWK-999, planned' },
    notConfig: {},
  });
  assert.deepEqual(declared, [], 'declared with its ticket -> silent: the honest case is one line');
});

test('config-keys: SELF-CLEANING 1, PENDING branch -- a planned key that LANDS in the schema FAILs, so the entry expires on the event', () => {
  // LOW-1. The NOT_CONFIG half of rule 1 was tested; this half was not, and it is the half
  // the whole expiry design rests on -- "an entry expires exactly when it stops being true",
  // which is the argument for having no calendar date at all. Dormant today only because
  // PENDING_KEYS is empty (scanEverything's own entry died this way in CWK-057), so the
  // declarations are injected rather than relying on the module's live list.
  const out = checkConfigKeys({
    schemaKeys: [...BASE, 'futureKey'],           // it landed
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'A `futureKey` override is planned.' }),
    pending: { futureKey: 'CWK-999, planned' },   // ...but the entry still claims it is pending
    notConfig: {},
  });
  assert.equal(out.length, 1, 'the stale declaration is the only finding -- the key itself now resolves');
  assert.equal(out[0].level, 'FAIL');
  assert.match(out[0].msg, /futureKey/);
  assert.match(out[0].msg, /now resolves in the schema/, 'the message must say WHY it expired');
  assert.match(out[0].msg, /delete the entry/, 'and what to do about it');
});

test('config-keys: PRECONDITION -- a schema key the rule cannot SEE is disclosed as a SKIP, never assumed absent', () => {
  // MEDIUM-1. `language` is a real key in this repo's own schema and fails KEY_SHAPE, so the
  // gate is structurally blind to it. That fact used to live in a comment that claimed the
  // opposite; it now comes from the live schema on every run and cannot go stale.
  const out = checkConfigKeys({
    schemaKeys: [...BASE, 'language'],
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'Set `language` to en.' }),
    ...NONE,
  });
  assert.equal(out.filter((f) => f.level === 'FAIL').length, 0, 'a blind spot is a disclosure, not a failure');
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 'SKIP');
  assert.match(out[0].msg, /language/, 'the SKIP NAMES the key it cannot see');

  const clean = checkConfigKeys({ schemaKeys: BASE, mdFiles: ['a.md'], read: mem({ 'a.md': 'nothing' }), ...NONE });
  assert.deepEqual(clean, [], 'and stays silent when every schema key is detectable');
});

test('config-keys: SELF-CLEANING 1 -- a NOT_CONFIG entry that becomes a real key FAILs as a lie', () => {
  const tok = Object.keys(NOT_CONFIG)[0];
  const out = checkConfigKeys({
    schemaKeys: [...BASE, tok],
    mdFiles: ['a.md'],
    read: mem({ 'a.md': 'mentions `' + tok + '` here' }),
  });
  assert.ok(out.some((f) => /the entry is a lie/.test(f.msg)), 'the declaration must not outlive its truth');
});

test('config-keys: SELF-CLEANING 2 -- a declaration no surface mentions FAILs as dead weight', () => {
  const out = checkConfigKeys({ schemaKeys: BASE, mdFiles: ['a.md'], read: mem({ 'a.md': 'nothing here' }) });
  const dead = out.filter((f) => /protects nothing/.test(f.msg));
  assert.equal(dead.length, Object.keys(NOT_CONFIG).length + Object.keys(PENDING_KEYS).length,
    'every unreferenced declaration is reported, so the list prunes itself');
});

test('config-keys: an absent surface is a visible SKIP, never a silent pass and never a false accusation', () => {
  const out = checkConfigKeys({
    schemaKeys: BASE,
    mdFiles: ['missing.md'],
    read: mem({}),
    notConfig: { someIdent: 'declared, but the only surface naming it was unreadable' },
    pending: {},
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 'SKIP', 'a partial scan degrades visibly');
  assert.match(out[0].msg, /missing\.md/);
  assert.ok(!out.some((f) => /protects nothing/.test(f.msg)),
    'and it must NOT convict the declaration -- a 0-hit proves nothing when the scope was incomplete');
});
