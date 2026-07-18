"""GraphQL types and queries for the `core` app.

The Project/Image types below are a read-only reference showing how
graphene-django maps Django models to GraphQL. Use them as a guide when
building the Jobs/Posts feature.
"""

import graphene
from graphene_django import DjangoObjectType

from .models import Image, Project
from .storage import presign_get


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


class Query(graphene.ObjectType):
    projects = graphene.List(ProjectType)
    project = graphene.Field(ProjectType, id=graphene.ID(required=True))

    def resolve_projects(self, info):
        return Project.objects.all()

    def resolve_project(self, info, id):
        return Project.objects.filter(pk=id).first()


class Mutation(graphene.ObjectType):
    pass
