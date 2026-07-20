import { appSchema, tableSchema } from "@nozbe/watermelondb";

// Column names are snake_case to match the API's Job/Post field names
// exactly (see apps/api/core/sync.py) — the sync payload is passed through
// close to verbatim, so keeping names aligned avoids a mapping layer.
export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "jobs",
      columns: [
        { name: "title", type: "string" },
        // "new" | "in_progress" | "complete" — see src/status.ts. Every new
        // Job starts "new"; only changed explicitly from the Job detail
        // screen.
        { name: "status", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "posts",
      columns: [
        { name: "job_id", type: "string", isIndexed: true },
        { name: "description", type: "string" },
        // Server-side object key + resolved public URL, populated once the
        // picture has been uploaded to MinIO and/or pulled from the server.
        { name: "picture_key", type: "string" },
        { name: "picture_content_type", type: "string" },
        { name: "picture_url", type: "string" },
        // Device-local file path for the captured/picked photo. Pushed like
        // any other column, but the server whitelist silently drops it
        // (see apps/api/core/sync.py's _POST_FIELDS) — it has no meaning
        // outside this device.
        { name: "picture_local_uri", type: "string" },
        // Same status enum as jobs.status.
        { name: "status", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
