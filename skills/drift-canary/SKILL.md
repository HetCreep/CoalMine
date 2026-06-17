---
name: drift-canary
description: >-
  Compatibility and schema drift canary — checks for database schema migration safety, breaking API contract changes, serializable payload mismatches, and backward compatibility drift. Triggers on keywords: "/drift-canary", "drift-canary", "contract drift", "breaking changes". Use when changing DB schemas, API contracts, serialized payloads, or required config keys.
---

# Drift Canary (Contract & Schema Drift Audit)

<!-- SHARED:LANGUAGE_HEADER -->

Audit code to ensure changes do not break backward compatibility or cause database/API mismatches.

## Auditing Categories
1. **Breaking Schema Migrations** — Database schema edits that drop columns, change types, or add non-null columns without defaults (causes crashes during deployments).
2. **API Contract breaking changes** — Modifying existing REST/GraphQL properties, removing API endpoints, or adding required query fields that break old clients.
3. **Serialization mismatches** — Editing properties in serialized data payloads (JSON, Protobuf, XML) without maintaining deserialization fallbacks.
4. **Library Contract Drift** — Changing the signature of public methods in a shared library without maintaining deprecated wrappers.
5. **Environment Configuration drift** — Introducing new required configuration keys (`.env` or OS variables) without providing defaults or fallback logic.

Expand/contract migration rules, per-format serialization fallbacks, and the breaking-vs-additive API checklist: read `references/checks.md` before scanning.

**Scope:** honor `.coalmine.json` `schemaPaths` / `migrationDirs` if set — scan those globs/dirs as the schemas and migration locations; else infer by inspecting the repo.

## Discipline
- **Style Drift Resolution (applies in Fix mode):** when an approved compatibility fix touches an area where multiple code styles are mixed, conform the minority patterns to the most dominant/frequent style (highest average usage) in the project to minimize churn — never start a standalone style refactor.

## Fix mode (choice-gated)

In Agent Context, after the audit report, present via `ask_question`:

- **Apply safe deprecations:** Mark API endpoints/methods as deprecated and add backward-compatibility mapping wrappers.
- **Let me pick:** Allow the user to select specific compatibility fixes.
- **Report only:** Exit without making changes.

## Output
`| file:line | contract interface | severity | finding | migration path |`

Severity: CRITICAL (breaking DB schema mutation / breaking API change) · HIGH (serialization type change) · MEDIUM (unmapped new required env key) · LOW (missing deprecation doc)

<!-- SHARED:ORCHESTRATION -->

<!-- SHARED:ESCALATION_FOOTER -->

