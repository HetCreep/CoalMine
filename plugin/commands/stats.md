---
description: CoalMine measurement dashboard — canary activity this session + rule-freshness status across the project's rules home
---

Produce the CoalMine stats report for this project, in the user's language. Two sections, tables only:

**1. Canary activity (this session, from conversation context):**
| canary | runs | findings (C/H/M/L) | fixes accepted |
Count every CoalMine canary invocation visible in this session (manual or hook-nudged). If none ran, one line saying so.

**2. Rule freshness (scan now):**
Grep the project's rules home (`.claude/rules/`, `.agents/rules/`, `AGENTS.md`) for `coalmine: verified` stamps. For each stamped rule:
| rule (file) | verified | revalidate | status |
Status = ✅ current · ⚠️ due within 7 days · ❌ OVERDUE. If any rule is overdue, end by offering `/gold-standard` re-validation via AskUserQuestion (Run now / Queue / Skip). If no stamps exist, say the project has no CoalMine-filled rules yet.

No prose beyond the tables and the single offer. Do not modify any file.
