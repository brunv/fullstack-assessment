import { Model, Relation } from "@nozbe/watermelondb";
import { date, field, readonly, relation } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

import type Job from "./Job";

export default class Post extends Model {
  static table = "posts";
  static associations: Associations = {
    jobs: { type: "belongs_to", key: "job_id" },
  };

  @field("job_id") jobId!: string;
  @field("description") description!: string;

  // Populated once the picture has been uploaded to MinIO (see the sync
  // pre-pass) and/or pulled down from the server.
  @field("picture_key") pictureKey!: string;
  @field("picture_content_type") pictureContentType!: string;
  @field("picture_url") pictureUrl!: string;

  // Device-local only; never resolved from the server, never displayed to
  // other devices. See schema.ts for why it's still a pushed column.
  @field("picture_local_uri") pictureLocalUri!: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;

  @relation("jobs", "job_id") job!: Relation<Job>;
}
