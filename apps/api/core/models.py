from django.db import models


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
