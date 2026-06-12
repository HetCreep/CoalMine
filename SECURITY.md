# Verifying CoalMine

## Commit & tag signatures

All commits and release tags are SSH-signed (`gpg.format=ssh`). Maintainer signing key:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEtqTWGKhX1Dk9nZP8ns13Wl5zsO1Cz3VlTS6m1p2fP9 HetCreep git signing key
```

To verify locally:

```bash
# one-time setup
echo "noreply@hetcreep ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEtqTWGKhX1Dk9nZP8ns13Wl5zsO1Cz3VlTS6m1p2fP9" > coalmine_signers
git config gpg.ssh.allowedSignersFile ./coalmine_signers

# verify
git verify-commit HEAD
git tag -v v2.4.0
```

On GitHub, signed commits show the **Verified** badge automatically.

## Dist integrity

`plugin/` (what the Claude Code marketplace serves) is generated output, gated two ways:

- `node scripts/verify.mjs` re-renders every skill from source and byte-compares the committed dist — both directions (stale AND orphan), including `references/` and `skill-meta.json`. Pre-commit/pre-push hooks run it on every commit.
- Any consumer can reproduce: clone, run `node scripts/build-plugin.mjs`, diff against the committed `plugin/` — byte-identical by construction.

## Reporting

Security issue in a canary skill, hook, or installer: open a GitHub issue (no sensitive PoC in public issues — request a private channel first).
