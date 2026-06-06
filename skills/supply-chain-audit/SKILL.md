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

## Escalation — multi-agent mode

Auto-escalate when:
- Full audit across all 3 sections (deps + build + artifact)
- Dep tree > 20 packages

**Claude Code** — 3 parallel Agents: deps scan · build/CI · artifact integrity → merge results. ultracode (Workflow tool) preferred when user opts in.

**Other agents:**
| Agent | Equivalent |
|---|---|
| GitHub Copilot | Copilot Workspace (parallel agents) |
| Cursor | Background Agents (⌘E / Ctrl+E) |
| Windsurf | Cascade multi-agent |
| Cline · Amp · Junie · Goose | parallel tool chains / concurrent instances |
| Gemini CLI | multi-agent dispatch |
| OpenAI Codex | parallel task runners |

Announce in the user's language:
- Thai: "audit ครบ 3 section — ใช้ multi-agent ไหม? (deps / build / artifact parallel) (ลุย / เบา ๆ)"
- English: "Full audit — multi-agent? (deps / build / artifact in parallel) (yes, fan out / keep focused)"
- Other: translate naturally.
