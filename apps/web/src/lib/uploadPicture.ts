import type { ApolloClient } from "@apollo/client";

import {
  CREATE_PRESIGNED_UPLOAD,
  type CreatePresignedUploadResult,
  type CreatePresignedUploadVars,
} from "@/graphql/operations";

/** Presigns an upload for `file`, PUTs the bytes directly to MinIO (the API
 * never proxies them), and returns the resulting object key — the same
 * presigned-MinIO-upload flow the mobile sync worker uses. */
export async function uploadPicture(
  client: ApolloClient<object>,
  file: File,
): Promise<{ key: string; contentType: string }> {
  const { data } = await client.mutate<CreatePresignedUploadResult, CreatePresignedUploadVars>({
    mutation: CREATE_PRESIGNED_UPLOAD,
    variables: { filename: file.name, contentType: file.type },
  });

  if (!data) {
    throw new Error("Could not get an upload URL");
  }
  const { uploadUrl, key } = data.createPresignedUpload;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return { key, contentType: file.type };
}
