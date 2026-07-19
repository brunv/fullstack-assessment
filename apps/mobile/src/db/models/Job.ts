import { Model, Query } from "@nozbe/watermelondb";
import { children, date, field, readonly } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

import type Post from "./Post";

export default class Job extends Model {
  static table = "jobs";
  static associations: Associations = {
    posts: { type: "has_many", foreignKey: "job_id" },
  };

  @field("title") title!: string;

  // WatermelonDB auto-manages these because the model exposes `createdAt`/
  // `updatedAt` properties: created_at is set once on record creation,
  // updated_at is bumped on every .update() call.
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;

  @children("posts") posts!: Query<Post>;
}
