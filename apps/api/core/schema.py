"""GraphQL types and queries for the `core` app.

The Project/Image types below are a read-only reference showing how
graphene-django maps Django models to GraphQL. Use them as a guide when
building the Jobs/Posts feature.
"""

import os
import uuid

import graphene
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from .models import Image, Job, Post, Project, Status, soft_delete_job, soft_delete_post
from .storage import presign_get, presign_put, public_url


class ProjectType(DjangoObjectType):
    class Meta:
        model = Project
        fields = ("id", "name", "description", "created_at", "images")


class ImageType(DjangoObjectType):
    download_url = graphene.String()

    class Meta:
        model = Image
        fields = (
            "id",
            "project",
            "original_name",
            "content_type",
            "uploaded_at",
        )

    def resolve_download_url(self, info):
        return presign_get(self.file.name)


class JobType(DjangoObjectType):
    # Overrides graphene_django's auto-generated enum for the `choices`
    # CharField — it can't serialize a Django TextChoices member directly
    # ("cannot represent value: Status.NEW"). A plain string, resolved
    # explicitly, sidesteps that entirely and matches picture_url below.
    status = graphene.String()

    class Meta:
        model = Job
        fields = ("id", "title", "status", "created_at", "updated_at", "posts")

    def resolve_posts(self, info):
        return self.posts.filter(is_deleted=False)

    def resolve_status(self, info):
        return str(self.status)


class PostType(DjangoObjectType):
    picture_url = graphene.String()
    status = graphene.String()

    class Meta:
        model = Post
        fields = (
            "id",
            "job",
            "description",
            "picture_content_type",
            "status",
            "created_at",
            "updated_at",
        )

    def resolve_picture_url(self, info):
        return public_url(self.picture_key) if self.picture_key else None

    def resolve_status(self, info):
        return str(self.status)


class Query(graphene.ObjectType):
    projects = graphene.List(ProjectType)
    project = graphene.Field(ProjectType, id=graphene.ID(required=True))
    jobs = graphene.List(JobType)
    job = graphene.Field(JobType, id=graphene.ID(required=True))
    posts = graphene.List(PostType)

    def resolve_projects(self, info):
        return Project.objects.all()

    def resolve_project(self, info, id):
        return Project.objects.filter(pk=id).first()

    def resolve_jobs(self, info):
        return Job.objects.filter(is_deleted=False)

    def resolve_job(self, info, id):
        return Job.objects.filter(pk=id, is_deleted=False).first()

    def resolve_posts(self, info):
        # All posts across all jobs — backs the web "Posts" page and mirrors
        # what mobile's Posts tab reads locally (postsCollection with no
        # job_id filter). select_related avoids an N+1 when the client asks
        # for `job { title }` on each row.
        return Post.objects.filter(is_deleted=False).select_related("job")


# Note: none of the mutations below are the mobile app's primary write path —
# mobile writes/deletes locally to WatermelonDB first and syncs via
# core.sync's pull/push endpoint. These exist for API completeness (the
# README's expected scope lists createJob/createPost explicitly) and for a
# future web client, and are the fastest way to exercise the storage/model
# layer manually via GraphiQL.


class CreateJob(graphene.Mutation):
    class Arguments:
        title = graphene.String(required=True)

    job = graphene.Field(JobType)

    def mutate(self, info, title):
        job = Job.objects.create(title=title)
        return CreateJob(job=job)


class CreatePost(graphene.Mutation):
    class Arguments:
        job_id = graphene.ID(required=True)
        description = graphene.String(required=False)
        picture_key = graphene.String(required=False)
        picture_content_type = graphene.String(required=False)

    post = graphene.Field(PostType)

    def mutate(
        self,
        info,
        job_id,
        description="",
        picture_key="",
        picture_content_type="",
    ):
        job = Job.objects.filter(pk=job_id, is_deleted=False).first()
        if job is None:
            raise GraphQLError("Job not found")
        post = Post.objects.create(
            job=job,
            description=description or "",
            picture_key=picture_key or "",
            picture_content_type=picture_content_type or "",
        )
        return CreatePost(post=post)


class CreatePresignedUpload(graphene.Mutation):
    """Generic presigned-upload mutation, reused for any picture — mirrors
    the README's described (but previously unimplemented) demo-flow pattern.
    """

    class Arguments:
        filename = graphene.String(required=True)
        content_type = graphene.String(required=True)

    upload_url = graphene.String()
    key = graphene.String()

    def mutate(self, info, filename, content_type):
        safe_filename = os.path.basename(filename) or "upload"
        key = f"posts/{uuid.uuid4().hex}-{safe_filename}"
        upload_url = presign_put(key, content_type)
        return CreatePresignedUpload(upload_url=upload_url, key=key)


def _validate_status(status: str) -> str:
    if status not in Status.values:
        raise GraphQLError(f"Invalid status: {status!r}. Must be one of {list(Status.values)}.")
    return status


class UpdateJobStatus(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)

    job = graphene.Field(JobType)

    def mutate(self, info, id, status):
        job = Job.objects.filter(pk=id, is_deleted=False).first()
        if job is None:
            raise GraphQLError("Job not found")
        job.status = _validate_status(status)
        job.save(update_fields=["status", "updated_at"])
        return UpdateJobStatus(job=job)


class UpdatePostStatus(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)

    post = graphene.Field(PostType)

    def mutate(self, info, id, status):
        post = Post.objects.filter(pk=id, is_deleted=False).first()
        if post is None:
            raise GraphQLError("Post not found")
        post.status = _validate_status(status)
        post.save(update_fields=["status", "updated_at"])
        return UpdatePostStatus(post=post)


class DeleteJob(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean()

    def mutate(self, info, id):
        job = Job.objects.filter(pk=id).first()
        if job is None:
            raise GraphQLError("Job not found")
        soft_delete_job(job)
        return DeleteJob(ok=True)


class DeletePost(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean()

    def mutate(self, info, id):
        post = Post.objects.filter(pk=id).first()
        if post is None:
            raise GraphQLError("Post not found")
        soft_delete_post(post)
        return DeletePost(ok=True)


class Mutation(graphene.ObjectType):
    create_job = CreateJob.Field()
    create_post = CreatePost.Field()
    create_presigned_upload = CreatePresignedUpload.Field()
    update_job_status = UpdateJobStatus.Field()
    update_post_status = UpdatePostStatus.Field()
    delete_job = DeleteJob.Field()
    delete_post = DeletePost.Field()
