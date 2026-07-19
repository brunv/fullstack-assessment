from django.contrib import admin

from .models import Image, Job, Post, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "project", "uploaded_at")
    list_filter = ("project",)


class NoHardDeleteAdmin(admin.ModelAdmin):
    """Blocks admin's default hard-delete action, which would bypass the
    is_deleted tombstone entirely (CASCADE hard-deletes with zero sync
    reconciliation for other devices). Use the app's soft-delete helpers
    instead."""

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Job)
class JobAdmin(NoHardDeleteAdmin):
    list_display = ("id", "title", "is_deleted", "created_at", "updated_at")
    list_filter = ("is_deleted",)
    search_fields = ("title",)


@admin.register(Post)
class PostAdmin(NoHardDeleteAdmin):
    list_display = ("id", "job", "description", "is_deleted", "created_at")
    list_filter = ("job", "is_deleted")
