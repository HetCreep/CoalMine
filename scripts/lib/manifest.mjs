// Install manifest with per-file integrity hashes — the SFC-lite layer.
//
// Windows' System File Checker restores OS files that no longer match a known
// hash. CoalMine's installer is the analog: at install time it records the
// SHA-256 of every file it writes into the manifest; `verify.mjs <target>` later
// re-hashes those files and flags any that changed. This catches an installed
// skill or hook that was altered AFTER install — a surface git never sees,
// because installs live outside the repo.
//
// Threat boundary (stated honestly): an attacker who rewrites a file AND its
// manifest hash defeats this self-check. That is a higher bar (needs the format
// + recompute), and the repo side is covered separately by the git-signed
// canonical + verify.mjs byte-compare. Defense in depth, not a silver bullet.
//
// Pure, Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MANIFEST_NAME = '.coalmine-manifest.json';

export function hashFile(p) {
  return createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

// Walk each installed skill dir and hash every file. Keys are POSIX-style
// "<skill>/<relpath>" so the manifest is identical across OSes (determinism).
export function hashInstalledTree(destDir, skillNames) {
  const hashes = {};
  const walk = (abs, relParts) => {
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const childAbs = path.join(abs, e.name);
      const childRel = [...relParts, e.name];
      if (e.isDirectory()) walk(childAbs, childRel);
      else {
        try { hashes[childRel.join('/')] = hashFile(childAbs); } catch {}
      }
    }
  };
  for (const s of skillNames) walk(path.join(destDir, s), [s]);
  return hashes;
}

// Re-hash the installed tree and compare to the manifest's recorded hashes.
// Returns { ok, findings[], checked } — findings carry { level, msg }.
export function verifyAgainstManifest(destDir) {
  const findings = [];
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(destDir, MANIFEST_NAME), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return { ok: true, findings: [{ level: 'SKIP', msg: 'no install manifest at target — integrity check skipped' }], checked: 0 };
  }
  const recorded = manifest && manifest.hashes;
  if (!recorded || typeof recorded !== 'object') {
    return { ok: true, findings: [{ level: 'SKIP', msg: 'manifest predates integrity hashes (reinstall to enable) — check skipped' }], checked: 0 };
  }
  let checked = 0;
  for (const [rel, want] of Object.entries(recorded)) {
    // rel is "<skill>/<posix relpath>" — never trust it to escape destDir.
    const segs = rel.split('/').filter(Boolean);
    if (segs.some((s) => s === '.' || s === '..')) {
      findings.push({ level: 'FAIL', msg: `manifest entry '${rel}' has a path-traversal segment — ignored` });
      continue;
    }
    const p = path.join(destDir, ...segs);
    checked++;
    let got;
    try { got = hashFile(p); } catch {
      findings.push({ level: 'FAIL', msg: `installed file MISSING: ${rel}` });
      continue;
    }
    if (got !== want) findings.push({ level: 'FAIL', msg: `installed file TAMPERED (hash changed): ${rel}` });
  }
  return { ok: findings.every((f) => f.level !== 'FAIL'), findings, checked };
}
