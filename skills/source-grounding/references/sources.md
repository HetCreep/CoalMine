# Source-grounding — authoritative source map

## Where ground truth lives, per claim type
| Claim type | Primary source | Secondary |
|---|---|---|
| Package version / deprecation | the registry itself: npmjs.com, PyPI, crates.io, NuGet, RubyGems, pkg.go.dev | repo releases page |
| CVE / advisory | GHSA, OSV.dev, NVD (cross-check at least two) | vendor security bulletins |
| API / SDK signature | vendor docs site, then the SDK source on the repo | typed stubs (DefinitelyTyped etc.) |
| Language / runtime feature | official docs versioned to the runtime line (e.g. nodejs.org/docs/latest-vXX.x) | spec (TC39, PEP, RFC) |
| LLM model IDs / params / pricing | the provider's official docs + changelog pages — these move weekly-to-daily; NEVER from memory | provider SDK source |
| Agent-platform behavior (paths, hooks, tools) | vendor docs + the platform's open-source repo (tool definitions live in source) | release notes |
| Protocol / format | the RFC / spec document | reference implementation |
| Web standards | MDN + WHATWG/W3C spec | caniuse for support matrices |

## Triangulation rules
- AUTHORITATIVE questions (one ground truth: a version, a signature, a path) → go to the primary source; one good source suffices.
- DIVERSE questions (what's best / landscape / adoption) → ≥3 independent reputable sources; report conflicts instead of averaging them away.
- A single blog post is a lead, not a source — corroborate before citing.
- Leaked system prompts / unofficial dumps: usable only when no official inventory exists, always tagged ⚠️ unofficial with confidence lowered.

## Citation format in findings
`✅ <claim> — source: <url or file:line>` · `⚠️ unverified — check <exact source to consult>` · stable facts (math, language syntax) need no annotation.
