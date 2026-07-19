import { Q } from "@nozbe/watermelondb";
import { synchronize } from "@nozbe/watermelondb/sync";

import { apolloClient } from "../apollo";
import { SYNC_URL } from "../config";
import { CREATE_PRESIGNED_UPLOAD } from "../graphql/mutations";
import { database, postsCollection } from "./index";
import { updatePostPictureKey } from "./mutations";

let inFlightSync: Promise<void> | null = null;

/** Guarded by a single in-flight promise so concurrent trigger sources
 * (create, delete, app-foreground, connectivity-restored, manual button)
 * coalesce into one sync rather than racing — synchronize() must not be
 * called while one is already running. */
export function syncDatabase(): Promise<void> {
  if (inFlightSync) return inFlightSync;
  inFlightSync = performSync().finally(() => {
    inFlightSync = null;
  });
  return inFlightSync;
}

async function performSync(): Promise<void> {
  // Runs before synchronize(), not inside pushChanges: keeps the "upload
  // bytes" and "sync metadata" failure domains separate, and a slow/failed
  // upload can't block the metadata push for unrelated records.
  await uploadPendingPictures();

  try {
    await runSynchronize();
  } catch (firstError) {
    // WatermelonDB's documented recommendation: a push abort on conflict
    // should self-heal via one more pull+push cycle.
    await runSynchronize();
  }
}

async function runSynchronize(): Promise<void> {
  await synchronize({
    database,
    // A row may be created locally, pushed to the server, and then appear in
    // a later pull before this device has advanced its checkpoint past that
    // push. Treating pulled rows as "updated" avoids false "already exists
    // locally" warnings while still creating missing rows on other devices.
    sendCreatedAsUpdated: true,
    pullChanges: async ({ lastPulledAt, schemaVersion }) => {
      const params = new URLSearchParams({
        last_pulled_at: String(lastPulledAt ?? 0),
        schema_version: String(schemaVersion),
      });
      const response = await fetch(`${SYNC_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Pull failed with status ${response.status}`);
      }
      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const response = await fetch(SYNC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changes, lastPulledAt }),
      });
      if (!response.ok) {
        throw new Error(`Push failed with status ${response.status}`);
      }
    },
  });
}

async function uploadPendingPictures(): Promise<void> {
  const pending = await postsCollection
    .query(
      Q.where("picture_local_uri", Q.notEq("")),
      Q.where("picture_key", Q.eq("")),
    )
    .fetch();

  for (const post of pending) {
    // Each item's upload is isolated: a single failure must not throw out
    // of the pre-pass, so synchronize() still runs for everything else
    // (all Jobs, all picture-less Posts, all Posts whose upload succeeded).
    try {
      const contentType = "image/jpeg";
      const { data } = await apolloClient.mutate({
        mutation: CREATE_PRESIGNED_UPLOAD,
        variables: { filename: `${post.id}.jpg`, contentType },
      });
      const uploadUrl: string = data.createPresignedUpload.uploadUrl;
      const key: string = data.createPresignedUpload.key;

      const fileResponse = await fetch(post.pictureLocalUri);
      const blob = await fileResponse.blob();

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": contentType },
        body: blob,
      });
      if (!putResponse.ok) {
        throw new Error(`Upload failed with status ${putResponse.status}`);
      }

      await updatePostPictureKey(post, key, contentType);
    } catch (err) {
      console.warn(`Picture upload failed for post ${post.id}`, err);
    }
  }
}
