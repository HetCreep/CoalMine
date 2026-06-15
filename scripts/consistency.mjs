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

let findings;
try {
  findings = checkAll(repo);
} catch (e) {
  console.error(`FAIL: consistency check crashed: ${e.message}`);
  process.exit(1);
}

if (findings.length === 0) {
  console.log('CONSISTENCY: PASS — cross-document facts, doctrine mirrors, and stamps all agree.');
  process.exit(0);
}
for (const f of findings) console.log(`  ${f.level}  ${f.msg}`);
console.log('\nCONSISTENCY: FAIL');
process.exit(1);
