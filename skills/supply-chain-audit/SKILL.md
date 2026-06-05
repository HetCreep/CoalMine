---
name: supply-chain-audit
description: Audit a project's software supply chain — dependencies (CVEs, maintenance, licenses, transitive risk, phone-home/install-script behavior), build/CI integrity (CI-only release, SHA-pinned actions, lockfile, minimal permissions, reproducibility), and released-artifact integrity (checksums, signing, SBOM, provenance). Use before adding a dependency, before a release, or for a periodic supply-chain review. Grounds every CVE/version claim in an authoritative advisory DB. Reports risks; does not change dependencies unless asked.
---

# Supply-Chain Audit

Audit what the project **trusts and pulls in** — every dependency, the build pipeline, and the shipped artifact. Surface CVEs, abandoned/unmaintained deps, license traps, hidden network calls, and integrity gaps. Report; do NOT change deps unless asked (a bump/removal can break things).

## Input (infer if not given)
- **PROJECT + ecosystem(s)** — npm/pnpm · PyPI · crates · NuGet · Go · Maven… Read the manifests + lockfiles.
- **SCOPE** — `deps` | `build` | `artifact` | `all` (default all).
- **DEPTH** — QUICK (direct deps + criticals) | DEEP (full transitive + build + artifact + SBOM).

## 1. Dependencies
- **Vulnerabilities** — run the ecosystem auditor (table), then cross-check EVERY hit against an authoritative advisory DB (GHSA / OSV / NVD / RustSec). Cite the advisory ID + affected range + fixed version.
- **Maintenance** — last release date · commit recency · open/closed issue ratio · single-maintainer / bus-factor · archived / deprecated flag.
- **License** — each dep's license; flag copyleft (GPL/AGPL) inside a permissive project, missing/unknown license, incompatibilities.
- **Transitive** — audit the WHOLE tree, not just direct; flag deep chains, duplicate/conflicting versions, a vuln reachable only transitively (fix may need a parent bump).
- **Behavior / trust** — does a dep phone home, run install/postinstall scripts, send telemetry, or open the network at install/build/runtime? Flag any unexpected egress.
- **Bloat / risk** — heavyweight dep for trivial use (stdlib would do) · abandoned fork · typosquat-shaped name.

## 2. Build / CI integrity
- Release builds **CI-only** (not a dev laptop)?
- CI actions / base images pinned to a **commit SHA** (not a floating tag)?
- **Lockfile** committed AND enforced in CI (`npm ci` · `pip install -r ... --require-hashes` · `cargo --locked` · `--frozen-lockfile`)?
- Minimal CI token scope / permissions? No `pull_request_target` foot-guns? No secrets echoed?
- Toolchain versions documented (reproducible-ish build)?

## 3. Artifact integrity
- **Checksums** (SHA-256) published for every released binary?
- **Signed** (Authenticode / notarized / GPG)? If not — is the gap documented honestly (not hidden)?
- **SBOM** (SPDX / CycloneDX) generated?
- **Build provenance / attestation** (SLSA / sigstore)?
- Can a user verify a download BEFORE running it?

## Tooling by ecosystem
| Ecosystem | vuln audit | license | outdated |
|---|---|---|---|
| npm / pnpm | `npm audit` · `osv-scanner` | `license-checker` | `npm outdated` |
| Python | `pip-audit` · `osv-scanner` | `pip-licenses` | `pip list --outdated` |
| Rust | `cargo audit` (RustSec) | `cargo-deny` | `cargo outdated` |
| Go | `govulncheck` · `osv-scanner` | `go-licenses` | `go list -m -u all` |
| .NET | `dotnet list package --vulnerable` (PackageReference only) · OSV / Dependabot | `nuget` / clearlydefined | `dotnet list package --outdated` |
| any | `osv-scanner` · `trivy` · Dependabot / Renovate alerts | — | — |

> NB: `packages.config` (non-SDK .NET) doesn't support `--vulnerable` → rely on Dependabot / OSV.

## Discipline (non-negotiable)
- **Ground every CVE / fixed-version** in an authoritative advisory (GHSA / OSV / NVD / RustSec) and cite the ID — NEVER from memory (advisories change daily). (Invoke the `source-grounding` discipline.)
- **Severity:** CRITICAL (known-exploited / RCE / confirmed supply-chain compromise) > HIGH (vuln with a fix available, reachable) > MEDIUM (unmaintained / license risk) > LOW (bloat / merely outdated).
- **Direct vs transitive** kept separate; name the parent that must bump for a transitive fix.
- **Don't auto-change deps** — report + recommend the safe bump; the user decides (bumps break).
- **Reachability:** note whether a vuln's code path is actually used (a vuln in an unused feature is lower real risk) — but don't downgrade without evidence.
- If an auditor isn't installed → say so + fall back to OSV/GHSA lookups; never skip silently.
- State what you did NOT scan.

## Output
1. **Risk table** — sorted by severity:

   | package | direct/transitive | issue | severity | advisory / source | fixed-in | recommended action |

2. **Build + artifact checklist** — ✅/❌ per item + evidence (file/workflow line).
3. **Summary** — counts by severity + the top fixes (with the exact safe bump).
4. **Not scanned** — ecosystems / dimensions skipped + why.

## Depth / sub-agents
DEEP on a host with sub-agents: fan out **one worker per ecosystem** (or per dimension: deps / build / artifact). Strong model triages exploitability + reachability; cheap model lists license/outdated; synthesize, then an adversarial pass that challenges any "no vulnerabilities found" (prove the auditor actually ran + covered transitive). Single-model / no sub-agents → inline.

## Fix mode (opt-in — choice-gated)
Default = **report only** (do NOT change deps unless asked). To act, never auto-edit silently — after the report, **pop a selectable choice** (host choice UI, e.g. AskUserQuestion):
- **Fix safe now** — auto-apply only SAFE / additive / reversible fixes: commit or regenerate the lockfile, pin a CI action to its current commit SHA, add a missing checksum / SBOM / provenance step. Each goes through the harness below.
- **Let me pick** — list the findings; apply only the ones the user selects.
- **Report only** (default) — change nothing.

NEVER in "Fix safe now" (needs an explicit pick): **any dependency version bump or removal** — a bump can break the build or behavior, may need code changes, and must be followed by an install + test. Ground the fixed-version against the advisory (source-grounding) before proposing it.

**Safety harness — every applied fix:**
1. **Checkpoint first** — make a restore point before touching anything (git branch or commit; `git stash` if the tree is dirty). **No git / no restore point possible → do NOT auto-apply** (report-only, or one fix then stop for explicit confirm) — never run the verify-loop without a way to revert. If any harness step itself fails (reinstall/build won't run, revert fails) → **stop the whole run, restore the checkpoint + the old lockfile/manifest, and report** — don't keep applying.
2. **One fix → re-install + re-run** the build + tests (a lockfile/dep change must reinstall first).
3. **Verify-loop** — green ⇒ keep · red ⇒ **auto-revert that fix** (restore the old lockfile/manifest) and downgrade it to "report only".
4. **Diff summary** at the end — every change (kept + reverted) with the file + the exact version delta.

⚠️ No lockfile or no test coverage → a dep change can't be safely verify-looped; leave it to "pick" with a "no safety net" warning.

## Proportionality — don't overkill
Match effort to the task's size and stakes. **Default to the cheapest path that actually answers**: a small or low-stakes input → run **inline + QUICK**, no sub-agents, no DEEP pass, no fetch-everything. Escalate to fan-out / DEEP / strict **only** when size or risk justifies it. A 2-file change doesn't need a multi-agent sweep; a stable, well-known fact doesn't need three sources. When unsure, do the small version first and expand only if it surfaces something.

## Language
Write the report, all prose, **and every selectable choice / option label you pop** (e.g. the fix-mode or CONFORM menu) in **the user's language** — match whatever language they are conversing in (Thai -> Thai, etc.). Keep code, file paths, identifiers, commands, error text, and technical terms verbatim — never translate those.
