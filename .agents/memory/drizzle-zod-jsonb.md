---
name: drizzle-zod jsonb typing
description: How to type jsonb columns so createInsertSchema and Drizzle inserts typecheck
---

Rule: when a Drizzle `jsonb` column uses `.$type<MyType[]>()`, `createInsertSchema` infers the field poorly (custom/unknown), which breaks typechecking of inserts built from the Zod-parsed payload. Override the field explicitly in the insert schema: `createInsertSchema(table).omit({...}).extend({ checklist: z.array(z.object({...})).optional() })`, keeping the Zod shape identical to the `$type` generic.

**Why:** A jsonb checklist column typechecked fine in the schema but every `db.insert(...).values(parsed)` failed with "not assignable to SQL | T[] | Placeholder" until the insert schema's field was overridden to match the `$type` exactly.

**How to apply:** Any time a new jsonb column with `$type` is added to `shared/schema.ts`, add a matching `.extend` override in that table's insert schema, and make sure the type name isn't declared twice (a duplicate `export type` of the same name elsewhere in schema.ts produces confusing downstream errors).
