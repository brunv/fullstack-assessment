from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    # GraphiQL IDE enabled for local exploration.
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
]
