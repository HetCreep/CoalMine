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
```
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

## 🔬 Independent Scanning — NVIDIA SkillSpector

CoalMine is scanned using [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector) v2.1.4.

* **Static Scan (58/100 - HIGH):** Raises 3 false positives due to instruction-bearing patterns typical in audit tools:
  * `HIGH · P2 Hidden Instructions` (`skills/gold-standard/references/method.md:1`) - The metadata rule freshness stamp.
  * `MED · EA2 Autonomous Decision` (`skills/gold-standard/SKILL.md:26`) - The interactive consent gate description.
  * `MED · RA2 Session Persistence` (`hooks/rot-canary-stop.js:156`) - The stop hook session temp file (deleted on stop, zero garbage).
* **LLM Semantic Scan (0 findings):** Confirming zero actual risks when context is analyzed.

**Structural Assurance:** Security is built structurally. Every hook obeys the [Phoenix-13 rules](https://github.com/TheColliery/.github/blob/main/hooks-safety.md) (zero-dependency, no network, no child processes, fail-silent, session cleanup). No data-exfiltration path exists.
