---
name: DB migration approach
description: How to safely add new tables without breaking existing schema via drizzle push interactive prompts
---

## Rule
Never run `npm run db:push` interactively (or pipe `yes` to it) when there are untracked tables in the DB. Drizzle will show rename prompts for every existing-but-untracked table, and `yes` can destructively rename them.

## Why
This project has many tables that exist in Postgres but are not tracked in the current `shared/schema.ts` (legacy/experimental tables). When Drizzle's push command sees a new table in the schema with no matching DB table, it offers to rename one of the untracked tables — and piping `yes` accepts these renames.

## How to apply
For any new table addition, create it directly via `executeSql` in the code_execution tool:
```js
await executeSql({ sqlQuery: `CREATE TABLE IF NOT EXISTS my_new_table (...)` });
```
Verify afterward:
```js
await executeSql({ sqlQuery: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='my_new_table'` });
```
