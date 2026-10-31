---
name: schema-architect
description: Design database schemas, indexes, and migration files. Covers Postgres, MySQL, SQLite, and MongoDB. Catches normalization mistakes, designs index strategy from the query patterns, writes reversible migrations with up/down halves, and flags the foreign-key + cascade choices people usually get wrong. Use when the user says "design the schema", "model this data", "create a migration", "what indexes do I need", "is this normalized", or pastes an ER sketch and asks for a real schema.
---

# schema-architect — model the data so the queries get fast

## When to use this skill

Trigger when the user needs schema work or migration work. Strong signals:

- "design a schema for", "model this data"
- "write a migration that adds X"
- "what indexes do I need for query Y"
- "should this be one table or two?"
- "is this normalized correctly?"

Do *not* trigger for: ORM-only changes that don't touch the underlying schema, query optimization on existing schemas (use `perf-hunter`), or for trivial column additions (just add it, match the project's migration tool).

## The output contract

Schema or migration artifacts that:

1. **Capture the domain** — table names are real nouns, columns are unambiguous.
2. **Are normalized to the right degree** — usually 3NF, with explicit, justified denormalization where reads dominate.
3. **Have a deliberate index strategy** — every index has a query it supports; no "let's add an index on everything".
4. **Are reversible** — every `up` migration has a `down` that gets you back to the prior state without data loss (or explicitly documents why it can't).
5. **Run on production safely** — no naive `ALTER` on huge tables without a plan.

## Workflow

### 1 — Read the domain

From the spec or the user's description, list:

- **Entities** (the nouns: `User`, `Organization`, `Subscription`, `Invoice`)
- **Relationships** (1:1, 1:many, many:many, polymorphic)
- **Lifecycle events** (created, soft-deleted, archived, restored)
- **Queries** the app will run (`find all open invoices for an org`, `count active users by signup month`)

The queries shape the indexes. If the user can't list 5 queries, ask them.

### 2 — Pick the engine if it's not picked

If the choice is open:

- **Postgres** — default for OLTP unless there's a specific reason not to. Best-in-class indexing, JSON support, partial indexes, full-text search, triggers, materialized views.
- **MySQL** — fine, but Postgres has eaten its lead for new projects. Stick with MySQL only if the team's ops experience is there.
- **SQLite** — for single-process apps, local-first, embedded, or read-heavy with light writes.
- **Mongo** — only when the data is genuinely document-shaped, write patterns are append-mostly, and you can live without ACID transactions across collections. The "schemaless" pitch is a trap for relational data.

### 3 — Design the tables

For each entity:

- **Primary key**: `id` as `BIGINT` (autoincrement) for internal-only, or `TEXT` storing a ULID/UUID for anything user-facing or distributed. Never expose autoincrement IDs in URLs.
- **Timestamps**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Trigger or app-level updates `updated_at`.
- **Soft delete**: `deleted_at TIMESTAMPTZ` (nullable). Index it partial: `WHERE deleted_at IS NULL`.
- **Foreign keys**: real FKs with `ON DELETE` action decided per relationship:
  - `RESTRICT` (default) — don't let the parent go away
  - `CASCADE` — children belong to parent and should die with it (line items of an invoice)
  - `SET NULL` — children survive but lose the link (creator of a post that gets anonymized)
- **Nullability**: explicit. `NOT NULL` with a `DEFAULT` is almost always better than nullable with implicit "absent means default".
- **Enums**: `CHECK` constraint on a text column for low-cardinality (`status IN ('open','closed','archived')`), or a real enum type in Postgres. Avoid MySQL ENUMs (they're painful to alter).
- **Money**: `NUMERIC(12,2)` for human currency, or integer cents (`amount_cents BIGINT`). Never `FLOAT`.
- **Booleans**: `BOOLEAN NOT NULL DEFAULT FALSE`.

### 4 — Index strategy

For each query the app will run, the rule is:

- **Equality filter + sort**: composite index on `(filter_col, sort_col)` in that order.
- **Range filter**: index on the range column; if there's also an equality filter, equality first.
- **Foreign key lookups**: every FK column gets an index automatically (Postgres doesn't add one for you).
- **Unique constraints**: pair with the unique index they imply.
- **Partial index**: when most rows don't match (`WHERE deleted_at IS NULL`, `WHERE status = 'open'`).
- **Covering index** (Postgres `INCLUDE`): when the index alone can answer the query.

For each index, write a comment explaining the query it supports. If you can't, drop the index.

### 5 — Write the migration

For Postgres + a typical migration tool (Knex, Prisma, sqlx, Alembic):

```sql
-- up
CREATE TABLE invitations (
  id           TEXT PRIMARY KEY,
  org_id       BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email        CITEXT NOT NULL,
  token        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ
);

-- one pending invitation per (org, email)
CREATE UNIQUE INDEX invitations_unique_pending
  ON invitations (org_id, email)
  WHERE status = 'pending';

-- token lookup for the public accept page
CREATE UNIQUE INDEX invitations_by_token ON invitations (token);

-- "list pending invitations for an org"
CREATE INDEX invitations_org_status ON invitations (org_id, status)
  WHERE status = 'pending';

-- down
DROP TABLE invitations;
```

### 6 — The production safety check

Before declaring done, walk through:

- Will this `ALTER` lock the table? On Postgres, adding a `NOT NULL` column with a default >= 11 is fast; without a default, it's a rewrite.
- Will this index build block writes? `CREATE INDEX CONCURRENTLY` for large tables in Postgres.
- Does the down migration drop data? Say so explicitly. The user might want a `down` that errors out.
- Are there backfills needed? Write them as separate, idempotent steps. Long backfills shouldn't run inside a single migration transaction.

For *big* tables (millions of rows), the migration becomes multi-step:
1. Add the new column nullable
2. Backfill in batches
3. Add the `NOT NULL` constraint
4. Switch app code

Document this sequence; don't try to do it in one migration.

### 7 — Handover

Output:
- The migration file(s)
- A short comment block at the top explaining the why
- The query list the indexes support
- Any caveats: backfill plan, downtime risk, irreversible operations

## Patterns and anti-patterns

✅ **Do**:
- Use `CITEXT` for case-insensitive text columns (Postgres extension) — saves you from `LOWER(email)` everywhere.
- Add `CHECK` constraints liberally for invariants (`CHECK (start_at < end_at)`).
- Use `JSONB` for genuinely schemaless metadata, but index the specific keys you query (`CREATE INDEX ... ON tbl ((data->>'tenant_id'))`).
- Name FKs and indexes explicitly. Default names (`fk_xxx_yyy_zzz_abc`) are unreadable.

❌ **Don't**:
- Don't EAV ("entity-attribute-value") for "flexibility". It kills query performance and type safety.
- Don't use `VARCHAR(255)` cargo-culted from MySQL. In Postgres `TEXT` is the same, with no cost.
- Don't store JSON when you have structure. JSON is for shape that genuinely varies per row.
- Don't index foreign keys that you never join on. Some FKs exist only for referential integrity.
- Don't use `SERIAL` for new Postgres work — use `GENERATED BY DEFAULT AS IDENTITY`. SERIAL has known issues with sequence ownership.

## Example invocation

> User: "Design the schema for an org invitations feature. Postgres."

1. Read: invitations belong to organizations, are sent to email addresses, expire, and are accepted to create memberships.
2. Queries:
   - List pending invitations for an org (admin view)
   - Look up invitation by token (public accept page)
   - Find pending invitations for a given email (when the user signs up)
3. Decisions:
   - `invitations` table with FK to `organizations` (CASCADE) and `users` (RESTRICT on `invited_by`)
   - Unique partial index for `(org_id, email) WHERE status = 'pending'` — prevents duplicate active invites without blocking re-invitation after revoke
   - Token is unique
   - Status uses CHECK constraint enum
4. Write the migration shown above.
5. Note: token is generated app-side (use `crypto.randomBytes(32).toString('base64url')`) — schema doesn't enforce format.
6. Caveat: if the org is hard-deleted, all pending invites cascade — that's intentional; document it in the org-deletion runbook.

## See also

- `api-architect` — design the API on top of the schema
- `perf-hunter` — when a schema is in place but queries are slow
- `code-auditor` — sweep the codebase after a schema change to find ORM models that drifted
