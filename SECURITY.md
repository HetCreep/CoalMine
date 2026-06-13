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
git tag -v v3.6.0
```

On GitHub, signed commits show the **Verified** badge automatically.

## Dist integrity

`plugin/` (what the Claude Code marketplace serves) is generated output, gated two ways:

- `node scripts/verify.mjs` re-renders every skill from source and byte-compares the committed dist — both directions (stale AND orphan), including `references/` and `skill-meta.json`. Pre-commit/pre-push hooks run it on every commit.
- Any consumer can reproduce: clone, run `node scripts/build-plugin.mjs`, diff against the committed `plugin/` — byte-identical by construction.

## Independent scanning — NVIDIA SkillSpector

CoalMine is scanned with [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector) v2.1.3 — a security scanner for AI agent skills (prompt injection, data exfiltration, excessive agency, session persistence, dangerous code, supply-chain risk).

Its fast **static** pass raises 3 findings, each reviewed and confirmed a **false positive** — surface-pattern matches against what is itself a security-*audit* tool:

| Static finding | What it actually is |
|---|---|
| HIGH · P2 Hidden Instructions (`references/method.md`) | A `<!-- coalmine: verified … · revalidate Nd -->` rule-freshness **stamp** — machine-readable metadata, plainly reviewable, no invisible characters, no agent-directing content. SkillSpector flags every HTML comment. |
| MED · EA2 Autonomous Decision (`gold-standard/SKILL.md`) | The literal line *"ADOPT and every CONFORM fix are gated through `ask_question` — never assume approval"* — i.e. the consent gate itself. |
| MED · RA2 Session Persistence (`hooks/rot-canary-stop.js`) | Nudge text naming the kill-switch file `~/.claude/.rot-canary-off`. The hook's session temp files are session-scoped and deleted on stop (Phoenix #1 zero-garbage, #6 stateless). |

SkillSpector's **LLM semantic** analyzers returned **0 findings** on the content they evaluated; free-tier rate-limiting (HTTP 429) blocks a complete semantic pass, so the headline risk number falls back to the static (false-positive) result — it is not a measure of real risk.

**The real assurance is structural, not a scanner score.** Every CoalMine hook obeys the [Phoenix-13 commandments](docs/hooks-safety.md): zero external dependencies (#2), no network ever (#7), no child processes (#5), fail-silent (#4), session state cleaned on stop (#1/#6); every skill fix is consent-gated through the platform's question tool. There is no data-exfiltration path, no covert persistence, and nothing auto-executes.

## Reporting

Security issue in a canary skill, hook, or installer: open a GitHub issue (no sensitive PoC in public issues — request a private channel first).
