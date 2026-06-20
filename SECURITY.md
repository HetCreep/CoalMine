# Verifying CoalMine

CoalMine is verified under the same framework as **[CoalTipple](https://github.com/TheColliery/CoalTipple/blob/main/SECURITY.md)**: all execution hooks follow the [Phoenix-13 commandments](https://github.com/TheColliery/.github/blob/main/hooks-safety.md), builds are fully reproducible from source, and security scans run on each release.

---

## 🔒 Reporting a Vulnerability

To report a security issue in a canary, hook, or installer:
* Open a GitHub issue or request a private channel (avoid posting sensitive PoC logs in public).
* We will investigate and address reported issues promptly.

---

## 🔑 Commit & Tag Signatures

All commits and release tags are SSH-signed (`gpg.format=ssh`). Maintainer signing key:
```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEtqTWGKhX1Dk9nZP8ns13Wl5zsO1Cz3VlTS6m1p2fP9 HetCreep git signing key
```

Verify signatures locally:
```bash
# Setup allowed signers
echo "noreply@hetcreep ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEtqTWGKhX1Dk9nZP8ns13Wl5zsO1Cz3VlTS6m1p2fP9" > coalmine_signers
git config gpg.ssh.allowedSignersFile ./coalmine_signers

# Verify HEAD and latest tag
git verify-commit HEAD
git tag -v "$(git describe --tags --abbrev=0)"
```
*Note: Verified badges display automatically on GitHub.*

---

## 📦 Dist Integrity

The `plugin/` distribution directory is generated output gated by checks:
* **Pre-commit/Pre-push Gates:** `node scripts/verify.mjs` automatically re-renders skills from source and byte-compares the committed output to prevent drift.
* **Reproducible Builds:** Any user can clone, run `node scripts/build-plugin.mjs`, and verify the output is byte-identical.

---

<!-- version-transition: the pin below reflects the LAST ACTUAL scan -- do NOT bump the SkillSpector/CoalMine version, date, or score without a real re-scan (an unscanned version's security is UNVERIFIED; never claim coverage). Re-scan periodically or on a significant plugin/ skill change (skillspector/scan.ps1 CoalMine), then re-sync the 3 finding refs. Last run: SkillSpector v2.2.3 · CoalMine v3.7.7 (commit 3d51ee5) · 2026-06-20 · 100/100 · 10 false positives. Line refs drift on skill edits — verify against the fresh scan output. (This file is at the repo root, OUTSIDE the scanned plugin/ dir, so this comment is not scanned.) -->
## 🔬 Independent Scanning — NVIDIA SkillSpector

CoalMine is evaluated against [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector), run locally via `uvx` (no install). Score **100/100 (CRITICAL static)** — up from 58/100 because CoalMine now ships consent-gated **Self-Updating** (v3.7.5), which the static **RA1 self-modification** rule flags (×7) as a false positive; the jump is this new surface, not a defect. **10 findings, all false positives.**

**Scan provenance:** SkillSpector **v2.2.3** · CoalMine **v3.7.7** (commit `3d51ee5`) · **2026-06-20**. Scanning is event-driven (a new SkillSpector version, or a genuinely new attack surface) — this pins the last version actually verified.

* **Static Scan (100/100 - CRITICAL):** Raises 10 false positives. The 7 new since the 58/100 scan are all the consent-gated self-update:
  * `HIGH · RA1 Self-Modification` ×7 (the `/coalmine:update` command + the conductor's self-update scheduler + `self-update` comments) - the series **consent-gated Self-Updating**: the hook only SCHEDULES (no network), the agent offers the platform's own `claude plugin update`; the skill never rewrites its own files. The other 3 (unchanged — instruction-bearing patterns typical of audit tools):
  * `HIGH · P2 Hidden Instructions` (`skills/gold-standard/references/method.md:1`) - The metadata rule-freshness stamp (an instruction-shaped HTML comment carrying no command or exfil directive).
  * `MED · EA2 Autonomous Decision` (`skills/gold-standard/SKILL.md:26`) - The line reads "...**never** assume approval"; the scanner matched the substring "assume approval" and missed the "never". The `ask_question` gate is the opposite of acting without confirmation.
  * `MED · RA2 Session Persistence` (`hooks/rot-canary-stop.js:160`) - The stop-hook session temp file (written to `tmpdir`, deleted on stop; not an OS-persistence mechanism).
* **Method:** SkillSpector's static analyzer was **run locally (2026-06-18) via `uvx --from git+https://github.com/NVIDIA/skillspector.git skillspector scan`** against the conformed `plugin/` dist — no install required. (An earlier note that the binary "needs a Python 3.12 environment not on this setup" was incorrect: `uvx` runs it without a local Python install.)
* **LLM Semantic Scan:** attempted via NVIDIA (`NVIDIA_INFERENCE_KEY`, provider `nv_build`) but the API rate-limited the request (HTTP 429), so SkillSpector fell back to the static result above — by design.

**Structural Assurance:** Security is built structurally. Every hook obeys the [Phoenix-13 rules](https://github.com/TheColliery/.github/blob/main/hooks-safety.md) (zero-dependency, no network, no child processes, fail-silent, session cleanup). No data-exfiltration path exists.
