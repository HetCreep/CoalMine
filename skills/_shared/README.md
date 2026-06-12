# skills/_shared — injected template partials

Each partial below is injected into every `skills/*/SKILL.md` template wherever its marker appears. Rendering happens in `scripts/lib/render.mjs` (the only place that knows the rules) — used by `install.mjs`, `build-plugin.mjs`, and `verify.mjs`.

| Partial | Marker in SKILL.md template | Used by |
|---|---|---|
| `language-header.md` | `<!-- SHARED:LANGUAGE_HEADER -->` | all 9 templates |
| `orchestration.md` | `<!-- SHARED:ORCHESTRATION -->` | all 9 templates |
| `escalation-footer.md` | `<!-- SHARED:ESCALATION_FOOTER -->` | all 9 templates |

`orchestration.md` additionally contains `{{LIGHT_INTENT}}`, `{{STANDARD_INTENT}}`, `{{HEAVY_INTENT}}` placeholders, filled per skill from that skill's `skill-meta.json`.

Rules: source templates in `skills/` MUST keep their markers (verify.mjs fails if they are conformed in place). The committed `plugin/` dist MUST contain no markers — after editing anything here, run `node scripts/build-plugin.mjs`.

## The mold — canonical SKILL.md structure (principle 3: single brand)

Every skill template follows this section order; new skills copy it exactly:

1. frontmatter (`name` = dir name, kebab-case; `description` = what + `Triggers on:` keywords + use-when)
2. `# Title` → `<!-- SHARED:LANGUAGE_HEADER -->` → one mission line
3. Core sections (skill-specific: categories/checklist/acts)
4. `references/` pointer line(s) — every skill ships a `references/` dir for per-stack depth
5. `## Discipline`
6. `## Fix mode (choice-gated)` (or report-only note) → `## Output` + severity scale
7. `## Escalation — Scope & Model Quality` → tier table → `<!-- SHARED:ORCHESTRATION -->` → `<!-- SHARED:ESCALATION_FOOTER -->`
