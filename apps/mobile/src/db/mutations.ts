import { database, jobsCollection, postsCollection } from "./index";
import type Job from "./models/Job";
import type Post from "./models/Post";

export async function createJob(title: string): Promise<Job> {
  return database.write(async () => {
    return jobsCollection.create((job) => {
      job.title = title;
    });
  });
}

export async function createPost(
  job: Job,
  options: { description: string; pictureLocalUri?: string | null },
): Promise<Post> {
  return database.write(async () => {
    return postsCollection.create((post) => {
      post.jobId = job.id;
      post.description = options.description;
      post.pictureLocalUri = options.pictureLocalUri ?? "";
      post.pictureKey = "";
      post.pictureContentType = "";
      post.pictureUrl = "";
    });
  });
}

/** Marks a Job and all of its currently-fetched Posts as deleted in one
 * local batch, so the UI updates in the same tick with no round trip. The
 * server's own cascade (soft_delete_job) is a backstop in case this batch
 * is interrupted mid-way. */
export async function deleteJob(job: Job): Promise<void> {
  const posts = await job.posts.fetch();
  await database.write(async () => {
    await database.batch(
      job.prepareMarkAsDeleted(),
      ...posts.map((post) => post.prepareMarkAsDeleted()),
    );
  });
}

export async function deletePost(post: Post): Promise<void> {
  await database.write(async () => {
    await post.markAsDeleted();
  });
}

/** Records the MinIO object key for a Post's picture after a successful
 * upload — a normal write, so the subsequent sync push naturally includes
 * the now-resolved key. */
export async function updatePostPictureKey(
  post: Post,
  pictureKey: string,
  pictureContentType: string,
): Promise<void> {
  await database.write(async () => {
    await post.update((p) => {
      p.pictureKey = pictureKey;
      p.pictureContentType = pictureContentType;
    });
  });
}
