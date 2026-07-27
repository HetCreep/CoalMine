#!/usr/bin/env node
// CoalMine self-consistency check (on-demand) — the mechanical half of the
// "don't trust your own non-code artifacts" layer.
//
//   node scripts/consistency.mjs
//
// Verifies cross-document facts agree, doctrine mirrors are byte-identical, and
// every rule stamp is well-formed. Fail-loud (exit 1) per scripts-quality.md.
// The semantic half — a memory/rule prescription that contradicts a Commandment
// or a recorded decision — is caught by the gold-standard RE-VALIDATE pass, not
// here, because it has no canonical baseline to diff against.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAll } from './lib/consistency.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A crash is rendered as a finding rather than a second exit path: one output shape,
// and the process exits NATURALLY on its exit code — `process.exit()` can truncate a
// pending stdout write (node/runtime.md §7), which on a gate would silently drop the
// very FAIL lines it exists to print.
let findings;
try {
  findings = checkAll(repo);
} catch (e) {
  findings = [{ level: 'FAIL', msg: `consistency check crashed: ${e.message}` }];
}

if (findings.length === 0) {
  // Scope-honest wording: the mirror check compares the rule homes that EXIST here,
  // and a repo with neither home compares nothing. Claiming "doctrine mirrors agree"
  // in that case would be the same false all-clear the enumerated check just closed.
  console.log('CONSISTENCY: PASS — cross-document facts and stamps agree; doctrine mirrors agree across the rule homes present in this repo (an absent rule home is not compared).');
} else {
  for (const f of findings) console.log(`  ${f.level}  ${f.msg}`);
  console.log('\nCONSISTENCY: FAIL');
  process.exitCode = 1;
}
