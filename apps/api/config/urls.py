from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView

from core.sync import sync_view


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    # GraphiQL IDE enabled for local exploration.
    path("graphql/", csrf_exempt(GraphQLView.as_view(graphiql=True))),
    # WatermelonDB sync protocol: GET pulls, POST pushes. The mobile app is
    # fully anonymous (no auth anywhere in this app), so csrf_exempt mirrors
    # the graphql/ route above.
    path("sync/", csrf_exempt(sync_view)),
]
