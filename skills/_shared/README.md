# skills/_shared — injected template partials

Each partial below is injected into every `skills/*/SKILL.md` template wherever its marker appears. Rendering happens in `scripts/lib/render.mjs` (the only place that knows the rules) — used by `install.mjs`, `build-plugin.mjs`, and `verify.mjs`.

| Partial | Marker in SKILL.md template | Used by |
|---|---|---|
| `language-header.md` | `<!-- SHARED:LANGUAGE_HEADER -->` | all 9 templates |
| `contexts.md` | `<!-- SHARED:CONTEXTS -->` | **no template currently** — authoring source for project-level rules (AGENTS.md Work-Gate/Haldane/Proactive sections); marker stays reserved |
| `orchestration.md` | `<!-- SHARED:ORCHESTRATION -->` | all 9 templates |
| `escalation-footer.md` | `<!-- SHARED:ESCALATION_FOOTER -->` | all 9 templates |

`orchestration.md` additionally contains `{{LIGHT_INTENT}}`, `{{STANDARD_INTENT}}`, `{{HEAVY_INTENT}}` placeholders, filled per skill from that skill's `skill-meta.json`.

Rules: source templates in `skills/` MUST keep their markers (verify.mjs fails if they are conformed in place). The committed `plugin/` dist MUST contain no markers — after editing anything here, run `node scripts/build-plugin.mjs`.
