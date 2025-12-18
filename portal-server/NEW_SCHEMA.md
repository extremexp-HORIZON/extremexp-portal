# Proposed PostgreSQL Schema (server-experiment)

This document outlines a relational redesign of the current MongoDB data model. It targets PostgreSQL and is intended for future SQLModel implementations. The goals are to keep the domain model simple, enforce referential integrity, and preserve important behaviors from the existing service.

## Conventions

- All primary keys use `UUID` (recommended to adopt UUIDv7 once available). Until then, `gen_random_uuid()` (from `pgcrypto`) or `uuid_generate_v4()` can act as a placeholder default.
- `created_at`/`updated_at` fields use `TIMESTAMPTZ` with defaults (`NOW()`) and trigger-based auto-update for `updated_at`.
- JSON structures (`graphical_model`, `steps`) are stored in `JSONB`).
- Auditing columns or soft deletes can be added later if the product requires them.

## Entity Relationship Diagram (conceptual)

```
app_user 1 ──<>── category 1 ──<>── task
   │                    │
   └──<>── experiment   └──<>── workflow
```

Legend: `<>` indicates optional participation (system-owned “official” resources have no user owner).

## Tables

### `app_user`

Stores user identities referenced by owned resources. If the identity provider remains external (e.g., Keycloak), this table still offers referential integrity for usernames or subject identifiers.

| Column        | Type        | Constraints/Notes |
|---------------|-------------|-------------------|
| `id`          | `UUID`      | Primary key. |
| `username`    | `TEXT`      | Unique; matches authenticated username or subject. |
| `display_name`| `TEXT`      | Optional friendly label. |
| `created_at`  | `TIMESTAMPTZ` | Default `NOW()`. |

**Indexes**
- `UNIQUE (username)` to prevent duplicates.

### `category`

Represents task categories, both official and user-defined.

| Column         | Type        | Constraints/Notes |
|----------------|-------------|-------------------|
| `id`           | `UUID`      | Primary key. |
| `owner_id`     | `UUID`      | Nullable FK → `app_user(id)`; null when `is_official = TRUE`. |
| `name`         | `TEXT`      | 1–120 chars; enforced via SQLModel validators. |
| `description`  | `TEXT`      | Optional; empty string by default. |
| `is_official`  | `BOOLEAN`   | Default `FALSE`. Official categories are seeded and immutable. |
| `created_at`   | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at`   | `TIMESTAMPTZ` | Default `NOW()` with trigger to auto-update. |

**Constraints & Indexes**
- `CHECK (is_official = FALSE OR owner_id IS NULL)` to prevent owners on official data.
- Partial unique index for user-owned categories: `UNIQUE (owner_id, name) WHERE owner_id IS NOT NULL` (enforces uniqueness per user).
- Unique index for official categories: `UNIQUE (name) WHERE owner_id IS NULL`.
- B-tree index on `is_official` to speed official category lookups (optional).

### `task`

Stores tasks under a category; retains JSON payload for the graphical model.

| Column            | Type        | Constraints/Notes |
|-------------------|-------------|-------------------|
| `id`              | `UUID`      | Primary key. |
| `category_id`     | `UUID`      | FK → `category(id)` with `ON DELETE CASCADE`. |
| `owner_id`        | `UUID`      | Nullable FK → `app_user(id)`; null for official tasks. |
| `name`            | `TEXT`      | 1–120 chars. |
| `provider`        | `TEXT`      | Optional string referencing integration provider. |
| `description`     | `TEXT`      | Defaults to `"This task has no description yet."`. |
| `graphical_model` | `JSONB`     | Default `'{"nodes": [], "edges": []}'`. |
| `is_official`     | `BOOLEAN`   | Default `FALSE`. |
| `created_at`      | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`; maintained via trigger. |

**Constraints & Indexes**
- `CHECK (is_official = FALSE OR owner_id IS NULL)` to mirror category constraint.
- `CHECK (provider IS NOT NULL) WHEN owner_id IS NOT NULL` (enforce existing requirement that user-defined tasks supply a provider).
- Unique partial indexes:
  - `UNIQUE (category_id, owner_id, name) WHERE owner_id IS NOT NULL` (per-user uniqueness).
  - `UNIQUE (category_id, name) WHERE owner_id IS NULL` (official tasks).
- Index on `(category_id, owner_id)` to accelerate mixed task queries.
- Index on `updated_at DESC` (or simple B-tree) for “recently updated” listings.

### `experiment`

Represents a saved experiment belonging to a user.

| Column            | Type        | Constraints/Notes |
|-------------------|-------------|-------------------|
| `id`              | `UUID`      | Primary key. |
| `owner_id`        | `UUID`      | FK → `app_user(id)` with `ON DELETE CASCADE`. |
| `name`            | `TEXT`      | 1–120 chars. Defaults to `Experiment-{timestamp}` in application layer. |
| `steps`           | `JSONB`     | Default `'[]'::jsonb`. |
| `graphical_model` | `JSONB`     | Default `'{"nodes": [], "edges": []}'`. |
| `created_at`      | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`; trigger-maintained. |

**Constraints & Indexes**
- `UNIQUE (owner_id, name)` to prevent duplicate names per user.
- Index on `updated_at DESC` for sorting recent experiments.
- Index on `owner_id` to support listing by user.

### `workflow`

Stores workflows, analogous to experiments.

| Column            | Type        | Constraints/Notes |
|-------------------|-------------|-------------------|
| `id`              | `UUID`      | Primary key. |
| `owner_id`        | `UUID`      | FK → `app_user(id)` with `ON DELETE CASCADE`. |
| `name`            | `TEXT`      | 1–120 chars. Defaults to `Workflow-{timestamp}` in application layer. |
| `graphical_model` | `JSONB`     | Default `'{"nodes": [], "edges": []}'`. |
| `created_at`      | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at`      | `TIMESTAMPTZ` | Default `NOW()`; trigger-maintained. |

**Constraints & Indexes**
- `UNIQUE (owner_id, name)` to mirror Mongo uniqueness.
- Index on `updated_at DESC`.
- Index on `owner_id`.

## Supporting Structures

### Timestamp Trigger

Use a reusable trigger function to update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Attach `BEFORE UPDATE` triggers to `category`, `task`, `experiment`, and `workflow`.

### Seed Data Process

- Seed official categories/tasks in transactional SQL migration scripts.
- Ensure official inserts explicitly set `is_official = TRUE` and leave `owner_id` null.
- When seeding tasks, populate `graphical_model` JSONB payloads to preserve official variants.

## Migration Notes

- Because the legacy Mongo store allowed documents without timestamps, migrations can set `created_at`/`updated_at` to the insertion timestamp (`NOW()`) for seeded data.
- If historical data is introduced later, ensure any `steps` or `graphical_model` JSON aligns with expected schema (consider JSON Schema validation in application or DB constraints).
- Consider future normalization (e.g., `task_variant` table) only if the application begins to require structured access to nested JSON data.

This schema provides a normalized baseline while preserving enough flexibility (via JSONB) to support existing front-end payloads. It should translate cleanly to SQLModel models with explicit relationships and constraints.
