import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import { migrations } from "./migrations";
import { schema } from "./schema";
import Job from "./models/Job";
import Post from "./models/Post";

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Job, Post],
});

export const jobsCollection = database.get<Job>("jobs");
export const postsCollection = database.get<Post>("posts");
