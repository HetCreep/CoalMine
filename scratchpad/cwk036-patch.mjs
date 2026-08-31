// CWK-036 patcher: PATCH a release body, then RE-GET to verify (never trust 200),
// then append the log line. Disk-first, one tag at a time.
import fs from 'node:fs';
const T = process.env.GITHUB_TOKEN;
const R = 'https://api.github.com/repos/HetCreep/CoalMine/releases';
const H = { Authorization: 'token ' + T, 'User-Agent': 'cm', 'Content-Type': 'application/json' };
export async function patch(tag, body, note) {
  const g = await fetch(`${R}/tags/${tag}`, { headers: H });
  if (!g.ok) throw new Error(`GET ${tag} ${g.status}`);
  const rel = await g.json();
  const p = await fetch(`${R}/${rel.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ body }) });
  if (!p.ok) throw new Error(`PATCH ${tag} ${p.status}`);
  // SHIP-VERIFIED: fresh re-GET, compare published bytes to what we sent.
  const v = await fetch(`${R}/tags/${tag}`, { headers: H, cache: 'no-store' });
  const after = (await v.json()).body || '';
  const ok = after.replace(/\r\n/g, '\n').trim() === body.replace(/\r\n/g, '\n').trim();
  fs.appendFileSync('scratchpad/cwk036-plan.md',
    `- ${tag} — ${ok ? 'VERIFIED by re-GET' : '**MISMATCH after re-GET**'} · ${note}\n`);
  if (!ok) throw new Error(`${tag}: re-GET mismatch`);
  return ok;
}
