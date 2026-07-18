"""Root GraphQL schema — stitches together each app's queries and mutations."""

import graphene

import core.schema


class Query(core.schema.Query, graphene.ObjectType):
    pass


class Mutation(core.schema.Mutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
