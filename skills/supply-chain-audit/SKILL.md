---
name: supply-chain-audit
description: Software supply chain audit — dependencies (CVEs, maintenance, licenses, transitive risk), build/CI integrity (SHA-pinned actions, lockfile, CI-only release), artifact integrity (checksums, signing, SBOM). Run before adding a dep, before a release, or for periodic review. Reports; does not change deps unless asked.
---

# Supply-Chain Audit

**Language:** Mirror the user's current writing language for ALL menus, choice labels, escalation prompts, and status messages. Detect from their input — Thai → Thai, English → English, Japanese → Japanese, etc. Never hardcode one language.

Audit what the project trusts: deps, build pipeline, shipped artifact. Report; do NOT change deps unless asked.

## 1. Dependencies
- **CVEs** — run ecosystem auditor; cross-check every hit in GHSA/OSV/NVD. Cite advisory ID + affected range + fixed version. (Invoke source-grounding — never from memory.)
- **Maintenance** — last release, commit recency, bus-factor, archived/deprecated flag.
- **License** — flag copyleft inside permissive project, missing/unknown license.
- **Transitive** — full tree; name the parent to bump for a transitive fix.
- **Behavior** — phone home? install scripts? unexpected egress?

## 2. Build / CI
- CI-only release builds?
- Actions pinned to commit SHA (not floating tag)?
- Lockfile committed + enforced in CI?
- Minimal token scope? No `pull_request_target`?

## 3. Artifact
- SHA-256 checksums published for every binary?
- Signed (Authenticode/GPG)? Gap documented honestly?
- SBOM generated?
- User can verify before running?

## Tooling
| Ecosystem | vuln | license | outdated |
|---|---|---|---|
| .NET | Dependabot / OSV (packages.config → no `--vulnerable`) | clearlydefined | `dotnet list package --outdated` |
| npm | `npm audit` | `license-checker` | `npm outdated` |
| Python | `pip-audit` | `pip-licenses` | `pip list --outdated` |
| Rust | `cargo audit` (RustSec) | `cargo-deny` | `cargo outdated` |

## Discipline
- Ground every CVE/fixed-version in an advisory. Never from memory.
- Don't auto-change deps — report + recommend; user decides (bumps break builds).
- State what was NOT scanned.

## Output
`| package | direct/transitive | issue | severity | advisory | fixed-in | action |`
Build+artifact checklist · Summary (counts + top fixes) · Not scanned

## Fix mode (choice-gated)
After report, pop choice:
- **Pin safe now** — commit already-present unchanged lockfile, pin CI action to current SHA, add missing checksum step. Each: checkpoint → apply → verify.
- **ให้ฉันเลือก** — user-selected fixes only.
- **รายงานอย่างเดียว** — change nothing.

(Translate choice labels to user's language — English: "pin safe now" / "let me pick" / "report only". Thai: as above.)

NEVER auto-fix: dep version bump, lockfile regen (re-resolves entire transitive tree). Non-interactive → report only.

## Escalation — adaptive tiers

Auto-select tier from dep-tree size and audit scope:

| Tier | Trigger | Claude Code | Other agents |
|---|---|---|---|
| **Light** | 1 section only · ≤10 packages | Single agent | Single session/chat |
| **Medium** | 2 sections · 11–20 packages | Parallel Agents: deps + build/CI (Agent tool) | Multi-file mode / multiple composers |
| **Heavy** | All 3 sections · >20 packages · "release"/"pre-ship" | Workflow (ultracode) — 3 parallel agents + adversarial verify on CRITICAL findings | Copilot Workspace · Cursor Background Agents · full Cascade · full orchestration |

Announce in user's language before starting:
- Thai: "งาน [N packages / N sections] → [Light/Medium/Heavy] audit. (เปลี่ยน tier: light / medium / heavy)"
- English: "Scope [N packages / N sections] → [Light/Medium/Heavy] audit. (override: light / medium / heavy)"
- Other: translate naturally.

User can always override the auto-selected tier.
