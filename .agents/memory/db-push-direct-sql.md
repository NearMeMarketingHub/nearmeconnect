---
name: DB push via direct SQL
description: drizzle-kit push has interactive prompts that block automation; use psql directly instead
---

## Rule
Never use `npm run db:push` in this project. Use `psql $DATABASE_URL -c "CREATE TABLE IF NOT EXISTS ..."` for all schema migrations.

**Why:** The `content_assets` table (or similar tables with enum changes) triggers interactive prompts in drizzle-kit push that block the shell. This has caused repeated failures.

**How to apply:** After adding new tables to shared/schema.ts, write the CREATE TABLE SQL directly and run it with psql. Use `IF NOT EXISTS` to make it idempotent.
