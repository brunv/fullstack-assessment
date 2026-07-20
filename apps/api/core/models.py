import random
import string

from django.db import models


def generate_client_id() -> str:
    """16-char alphanumeric id, matching WatermelonDB's default client-generated
    id shape (`/^[a-zA-Z0-9]{16}$/`) so server-created rows are safe to pull onto
    a mobile device without a separate id-mapping layer.
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=16))


class Status(models.TextChoices):
    """Shared by Job and Post. Every new Job/Post starts as NEW — status is
    only ever changed explicitly by the user from a Job/Post detail view."""

    NEW = "new", "New"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETE = "complete", "Complete"


class Project(models.Model):
    """A minimal domain entity for the interview scaffold."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Image(models.Model):
    """An image uploaded to MinIO (S3) and attached to a Project.

    `file` uses the default S3 storage, so `file.url` yields a presigned URL and
    deletes/reads go straight to MinIO.
    """

    project = models.ForeignKey(
        Project, related_name="images", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="images/")
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.original_name


class Job(models.Model):
    """A Job has many Posts. Synced with the mobile app's WatermelonDB store.

    `id` is client-generatable (see `generate_client_id`) so mobile-created
    rows and server-created rows share the same id shape. `is_deleted` is a
    tombstone flag, not a hard delete: WatermelonDB's sync pull protocol needs
    to report deleted ids to other devices, which is impossible to compute
    after a real SQL DELETE. Nothing in this app ever issues a hard delete on
    Job/Post — see `soft_delete_job`/`soft_delete_post` below.
    """

    id = models.CharField(
        primary_key=True, max_length=16, default=generate_client_id, editable=False
    )
    title = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class Post(models.Model):
    """A Post belongs to a Job and can optionally have a picture.

    The picture is uploaded directly to MinIO by the client via a presigned
    PUT (see `core.storage.presign_put`); this model only records the
    resulting object key, matching the README's demo-flow description.
    """

    id = models.CharField(
        primary_key=True, max_length=16, default=generate_client_id, editable=False
    )
    job = models.ForeignKey(Job, related_name="posts", on_delete=models.CASCADE)
    description = models.TextField(blank=True, default="")
    picture_key = models.CharField(max_length=500, blank=True, default="")
    picture_content_type = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.description or self.id


def soft_delete_post(post: "Post") -> None:
    if post.is_deleted:
        return
    post.is_deleted = True
    post.save(update_fields=["is_deleted", "updated_at"])


def soft_delete_job(job: "Job") -> None:
    """Soft-deletes a Job and cascades to all of its non-deleted Posts.

    Used by both the `deleteJob` GraphQL mutation and the sync push handler,
    so a push that only names the job's id still leaves Post rows consistent
    even if the client didn't separately list them.
    """
    if not job.is_deleted:
        job.is_deleted = True
        job.save(update_fields=["is_deleted", "updated_at"])
    for post in job.posts.filter(is_deleted=False):
        soft_delete_post(post)
