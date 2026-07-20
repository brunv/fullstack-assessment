import {
  addColumns,
  schemaMigrations,
  unsafeExecuteSql,
} from "@nozbe/watermelondb/Schema/migrations";

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({ table: "jobs", columns: [{ name: "status", type: "string" }] }),
        addColumns({ table: "posts", columns: [{ name: "status", type: "string" }] }),
        // addColumns leaves existing rows with a NULL status (SQLite has no
        // per-column default here) — backfill to "new" so every row still
        // has a valid status rather than needing null-handling everywhere.
        unsafeExecuteSql("UPDATE jobs SET status = 'new' WHERE status IS NULL;"),
        unsafeExecuteSql("UPDATE posts SET status = 'new' WHERE status IS NULL;"),
      ],
    },
  ],
});
