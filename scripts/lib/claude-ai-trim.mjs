// Deterministic description trim for claude.ai's ZIP-install skill-listing
// cap (200 chars) — a DERIVED value only, computed at build time for the
// ZIP artifact; the source skills/*/SKILL.md description stays at our own
// cross-platform 1024 cap (desc-cap.mjs) and is never edited by this.
export const CLAUDE_AI_DESC_CAP = 200;

// Trim to <= cap: cut at the last whitespace boundary before the reserved
// ellipsis budget, then append '...' (itself counted inside the cap).
// Deterministic — same input always produces the same output (Phoenix #8's
// no-randomness discipline, extended to build tooling).
export function trimDescription(description, cap = CLAUDE_AI_DESC_CAP) {
  if (description.length <= cap) return description;
  const budget = cap - 3; // reserve 3 chars for '...'
  let cut = description.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + '...';
}
