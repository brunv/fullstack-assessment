"use client";

import { useMutation } from "@apollo/client";
import { useState } from "react";
import { toast } from "sonner";

import {
  CREATE_JOB,
  JOBS_QUERY,
  type CreateJobResult,
  type CreateJobVars,
} from "@/graphql/operations";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateJobDialog({ open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [createJob, { loading }] = useMutation<CreateJobResult, CreateJobVars>(CREATE_JOB, {
    refetchQueries: [{ query: JOBS_QUERY }],
    awaitRefetchQueries: true,
  });

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await createJob({ variables: { title: trimmed } });
      handleClose();
    } catch (err) {
      toast.error("Couldn't create job", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New job">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Job title"
          autoFocus
          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
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
            disabled={!title.trim() || loading}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
