# Contributing to CoalMine

CoalMine is the 9-canary quality-safeguard suite of the [TheColliery](https://github.com/TheColliery) series. Issues, bug reports, and pull requests are welcome.

---

## 🤝 Proposing a Change

1. **Open an issue first** describing the bug, false positive/negative, or proposed canary/rule change (especially for any `SKILL.md` edit).
2. Make the change and keep the verification gates green (below).
3. For detection behaviour, validate it against a real fixture — a finding must be grounded in evidence, never inflated.

---

## 💻 Developing & Testing

CoalMine is **zero-dependency** (Node.js built-ins only, Node 18+). No `npm install` is required.

Keep the gates green before and after editing:

```bash
node scripts/build-plugin.mjs   # re-inject the _shared regions into each skill + rebuild plugin/
node scripts/verify.mjs         # validate config, plugin sync, and version pins
node scripts/consistency.mjs    # cross-doc counts, doctrine mirrors, well-formed stamps
```

The installer wires `verify.mjs`, `consistency.mjs`, and the `node --test` unit suite into `.git/hooks` (pre-commit + pre-push), so a clone that ran `scripts/install.mjs` runs them on every commit.

### Development Rules
* **`skills/_shared/` is the Single Source of Truth** for shared blocks (language header, escalation footer, orchestration). Edit there, then run `node scripts/build-plugin.mjs` to re-inject; never hand-edit the generated regions inside a skill.
* **Rebuild `plugin/`** after editing `skills/`, `hooks/`, or `.claude-plugin/plugin.json` — it is generated output.
* **Keep hooks Phoenix-pure:** zero dependencies, fail-silent (wrap in try/catch, never set a non-zero exit, never call `process.exit()`), no network, 100% local. Every hook ships a hermetic spawn test.
* **Add unit tests:** every shared helper in `scripts/lib/` has a matching `*.test.mjs`.
* **Code style:** 2-space indent, semicolons, single quotes, Node built-ins only.
* **Language:** shipped source and docs stay in English.

---

## 🖥️ Supported Platforms

`SKILL.md` is an open standard. CoalMine installs on Claude Code (plugin `coalmine@coalmine`) and any subagent-capable agent via `node scripts/install.mjs <agent|all>` (writes to that agent's skills folder, e.g. `.agents/skills/`). See the [README](README.md#-universal-agent-support) for the full agent matrix and what ports where.

---

## 🗂️ Project Layout

| Path | Purpose |
|---|---|
| `skills/<canary>/SKILL.md` | The 9 canary skills (the audits). |
| `skills/_shared/` | Shared blocks injected into each skill at build time. |
| `hooks/` | Phoenix-pure lifecycle hooks (rot-canary auto-scan, conductor). |
| `scripts/` | `build-plugin`, `verify`, `consistency`, `install`, `configure` + `lib/`. |
| `plugin/` | Generated Claude Code plugin distribution. |
| `platform-configs/` | Per-agent install templates + manual hook snippets. |
| `agents/coalmine-scanner.md` | Read-only scan worker for Heavy-tier fan-out. |

---

## 🚀 Releasing (Maintainers)

Bump the version in `.claude-plugin/plugin.json` → add a `CHANGELOG.md` entry → ensure `verify.mjs`, `consistency.mjs`, and the test suite pass → commit → create a signed git tag (`vX.Y.Z`) → push `--follow-tags` → publish a GitHub Release for the stable tag.

---

## 📄 License & Conduct

Contributions are licensed under the [MIT License](LICENSE). Assume good faith and be respectful. Report security issues per [SECURITY.md](SECURITY.md); if a canary itself misbehaves, file it via the repo issues.
