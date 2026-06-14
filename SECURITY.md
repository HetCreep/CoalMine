# Verifying CoalMine

CoalMine is one tool in the **TheColliery** mining series, and it is verified the same way as its sibling **[CoalTipple](https://github.com/TheColliery/CoalTipple/blob/main/SECURITY.md)**: every executable hook obeys the [Phoenix-13 commandments](docs/hooks-safety.md), the distribution is reproducible from source, and an independent scanner is run each release. Across the series the **structure** is the assurance — not a scanner's number.

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

# verify (latest release tag, resolved dynamically — no version number to go stale)
git verify-commit HEAD
git tag -v "$(git describe --tags --abbrev=0)"
```

On GitHub, signed commits show the **Verified** badge automatically.

## Dist integrity

`plugin/` (what the Claude Code marketplace serves) is generated output, gated two ways:

- `node scripts/verify.mjs` re-renders every skill from source and byte-compares the committed dist — both directions (stale AND orphan), including `references/` and `skill-meta.json`. Pre-commit/pre-push hooks run it on every commit.
- Any consumer can reproduce: clone, run `node scripts/build-plugin.mjs`, diff against the committed `plugin/` — byte-identical by construction.

## Independent scanning — NVIDIA SkillSpector

<!-- version-transition: re-run SkillSpector each release; update the version + score + finding line-refs in this section. This file is repo-root, outside the scanned plugin/ dir, so this HTML comment is not SkillSpector-flagged. -->
CoalMine is scanned with [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector) v2.1.4 — a security scanner for AI agent skills (prompt injection, data exfiltration, excessive agency, session persistence, dangerous code, supply-chain risk).

Its fast **static** pass scores the bundle **58/100 (HIGH)** and raises 3 findings. Each was reviewed and confirmed a **false positive** — the static heuristic flags any instruction-bearing or comment-bearing file as suspicious, which is exactly what a security-*audit* skill is made of:

| Static finding | What it actually is |
|---|---|
| HIGH · P2 Hidden Instructions (`skills/gold-standard/references/method.md:1`) | The `<!-- coalmine: verified … · revalidate 90d -->` rule-freshness **stamp** — machine-readable metadata, plainly reviewable, no invisible characters, no agent-directing content. SkillSpector flags every HTML comment. |
| MED · EA2 Autonomous Decision (`skills/gold-standard/SKILL.md:26`) | The line *"ADOPT and every CONFORM fix are gated through `ask_question` — never assume approval"* — i.e. the consent gate itself, flagged as if it were the opposite. |
| MED · RA2 Session Persistence (`hooks/rot-canary-stop.js:156`) | The Stop hook's session temp file — written under `os.tmpdir()`, scoped by `session_id`, deleted on stop (Phoenix #1 zero-garbage, #6 stateless); the auto-scan cadence is consent-gated with a documented kill-switch. |

Why the headline number is pessimistic: SkillSpector's **LLM semantic** pass is what contextualizes these surface matches — on v2.1.3 it returned **0 findings** on the content it evaluated — but it requires prepaid Anthropic API credits to run; on a free-tier key with a zero credit balance it returns `credit balance too low` (earlier runs surfaced this as HTTP 429 rate-limiting, then a timeout), so the score falls back to the static, false-positive result. It is not a measure of real risk.

**The real assurance is structural, not a scanner score.** Every CoalMine hook obeys the [Phoenix-13 commandments](docs/hooks-safety.md): zero external dependencies (#2), no network ever (#7), no child processes (#5), fail-silent (#4), session state cleaned on stop (#1/#6); every skill fix is consent-gated through the platform's question tool. There is no data-exfiltration path, no covert persistence, and nothing auto-executes.

## Reporting

Security issue in a canary skill, hook, or installer: open a GitHub issue (no sensitive PoC in public issues — request a private channel first).
