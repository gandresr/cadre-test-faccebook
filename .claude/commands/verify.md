---
description: Run lint + typecheck + unit tests in parallel. Report failures only.
---

Run the verification suite **in parallel** (single message, multiple Bash calls):

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`

Then report:

- If all three pass: a single line "✅ lint, typecheck, tests all green".
- If any fail: paste *only* the failing output for each, grouped by which check failed. Do not include passing output.

After failure-reporting, suggest the smallest fix for each failure category but **do not apply fixes** unless the user confirms.

Reminder for the reviewer: type-check green is not the same as feature-works. After `/verify`, still manually click through the changed feature in the browser before declaring done.
