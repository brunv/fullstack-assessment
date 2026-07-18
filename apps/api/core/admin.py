from django.contrib import admin

from .models import Image, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "project", "uploaded_at")
    list_filter = ("project",)
