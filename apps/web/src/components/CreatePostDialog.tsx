"use client";

import { useApolloClient, useMutation } from "@apollo/client";
import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CREATE_POST,
  JOB_QUERY,
  type CreatePostVars,
} from "@/graphql/operations";
import { uploadPicture } from "@/lib/uploadPicture";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string;
};

export function CreatePostDialog({ open, onClose, jobId }: Props) {
  const client = useApolloClient();
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createPost] = useMutation<unknown, CreatePostVars>(CREATE_POST, {
    refetchQueries: [{ query: JOB_QUERY, variables: { id: jobId } }],
    awaitRefetchQueries: true,
  });

  const reset = () => {
    setDescription("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      let pictureKey: string | undefined;
      let pictureContentType: string | undefined;
      if (file) {
        const uploaded = await uploadPicture(client, file);
        pictureKey = uploaded.key;
        pictureContentType = uploaded.contentType;
      }

      await createPost({
        variables: { jobId, description: description.trim(), pictureKey, pictureContentType },
      });
      handleClose();
    } catch (err) {
      toast.error("Couldn't add post", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New post">
      <form onSubmit={handleSubmit}>
        {previewUrl ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={previewUrl} alt="" className="h-40 w-full rounded-md object-cover" />
            <button
              type="button"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setFile(null);
                setPreviewUrl(null);
              }}
              aria-label="Remove photo"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="mb-3 flex h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-primary)]">
            <ImagePlus size={18} />
            Add a photo (optional)
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full resize-none rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
