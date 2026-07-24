---
name: DB push via direct SQL
description: drizzle-kit push can hang on interactive prompts; how to diagnose and resolve, including the actual root cause found
---

## Rule
`npm run db:push -- --force` skips data-loss *confirmation* prompts but does NOT skip "is this column created or renamed?" ambiguity prompts. If the DB has columns that no longer exist in `shared/schema.ts` (orphaned/legacy columns), adding any new nullable column of a similar type will trigger this ambiguity prompt and hang non-interactive runs (e.g. the post-merge script, whose stdin is closed).

**Why:** drizzle-kit heuristically guesses that a new column might be a rename of an existing DB column not in the schema. The real fix is not to avoid `db:push` — it's to eliminate the orphaned columns causing the ambiguity.

**How to apply:**
1. When `db:push` hangs/prompts, identify the ambiguous column(s) it's asking about.
2. For missing columns that should exist per schema.ts (schema evolution added a field), add them directly via `psql $DATABASE_URL -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..."` with backfill as needed.
3. For orphaned columns not present in schema.ts and not referenced anywhere in server/client code (grep to confirm), drop them via psql (`ALTER TABLE ... DROP COLUMN IF EXISTS ...`). This removes the ambiguity source permanently.
4. After drift is fully resolved, `npm run db:push -- --force` runs cleanly non-interactively — keep the post-merge script using this form rather than avoiding db:push entirely.
