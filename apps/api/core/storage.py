"""Helpers for talking to MinIO directly (presigned URLs for direct uploads)."""

import boto3
from botocore.client import Config
from django.conf import settings


def _client(endpoint_url: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def presign_put(key: str, content_type: str, expires: int = 3600) -> str:
    """Presigned URL a client uses to PUT bytes straight into MinIO.

    Signed against the *public* endpoint so the host matches what the browser /
    mobile app will actually connect to.
    """
    client = _client(settings.AWS_S3_PUBLIC_ENDPOINT_URL)
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )


def presign_get(key: str, expires: int = 3600) -> str:
    """Presigned URL for downloading an object."""
    client = _client(settings.AWS_S3_PUBLIC_ENDPOINT_URL)
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
        ExpiresIn=expires,
    )
