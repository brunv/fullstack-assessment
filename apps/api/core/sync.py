"""WatermelonDB sync endpoint (pull/push) for Job/Post.

Implements the protocol described at
https://watermelondb.dev/docs/Sync/Backend and
https://watermelondb.dev/docs/Sync/Frontend:

- GET performs a *pull*: returns everything changed since `last_pulled_at`,
  bucketed per table into updated/deleted (with `created` intentionally empty;
  see `_pull_table` for rationale).
- POST performs a *push*: applies the client's local changes, aborting the
  whole batch (non-2xx) if the server has moved past `lastPulledAt` for any
  touched record — the client is expected to retry (re-pull, then re-push).

Timestamps cross the wire as epoch milliseconds, not ISO strings — that's
what WatermelonDB expects on both sides of the protocol.
"""

import json
from datetime import datetime, timezone as dt_timezone

from django.db import transaction
from django.http import HttpResponseBadRequest, HttpResponseNotAllowed, JsonResponse
from django.utils import timezone

from .models import Job, Post, Status, soft_delete_job, soft_delete_post
from .storage import public_url

_JOB_FIELDS = {"title", "status"}
_POST_FIELDS = {"job_id", "description", "picture_key", "picture_content_type", "status"}


class SyncConflict(Exception):
    pass


def _to_ms(dt) -> int:
    return int(dt.timestamp() * 1000)


def _from_ms(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=dt_timezone.utc)


def _serialize_job(job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "status": job.status,
        "created_at": _to_ms(job.created_at),
        "updated_at": _to_ms(job.updated_at),
    }


def _serialize_post(post: Post) -> dict:
    return {
        "id": post.id,
        "job_id": post.job_id,
        "description": post.description,
        "picture_key": post.picture_key,
        "picture_content_type": post.picture_content_type,
        "status": post.status,
        # Read-only on the client (not in _POST_FIELDS below, so a client
        # can't push a fake one back) — resolved here so posts synced from
        # another client (e.g. web) have something to display. Without this,
        # only the device that originally uploaded a picture could show it,
        # since only that device has a local pictureLocalUri.
        "picture_url": public_url(post.picture_key) if post.picture_key else "",
        "created_at": _to_ms(post.created_at),
        "updated_at": _to_ms(post.updated_at),
    }


def sync_view(request):
    if request.method == "GET":
        return _pull(request)
    if request.method == "POST":
        return _push(request)
    return HttpResponseNotAllowed(["GET", "POST"])


def _pull_table(model, serialize, last_pulled_at_ms: int) -> dict:
    qs = model.objects.all()
    if last_pulled_at_ms:
        qs = qs.filter(updated_at__gt=_from_ms(last_pulled_at_ms))

    # A device can create a record locally, push it to the server, and then
    # perform another pull using the pre-push checkpoint. If we classify that
    # row as "created", WatermelonDB warns because the record already exists
    # locally. Returning all changed non-deleted rows as "updated" keeps that
    # flow idempotent while `sendCreatedAsUpdated: true` on the client still
    # lets other devices materialize missing rows correctly.
    updated, deleted = [], []
    for row in qs:
        if row.is_deleted:
            deleted.append(row.id)
        else:
            updated.append(serialize(row))
    return {"created": [], "updated": updated, "deleted": deleted}


def _pull(request):
    # Captured once, at request start, rather than derived from a max() over
    # scanned rows — a per-row max can miss writes that land concurrently
    # with the pull scan.
    server_now = timezone.now()

    last_pulled_at_raw = request.GET.get("last_pulled_at")
    last_pulled_at_ms = int(last_pulled_at_raw) if last_pulled_at_raw else 0

    changes = {
        "jobs": _pull_table(Job, _serialize_job, last_pulled_at_ms),
        "posts": _pull_table(Post, _serialize_post, last_pulled_at_ms),
    }
    return JsonResponse({"changes": changes, "timestamp": _to_ms(server_now)})


def _check_conflicts(model, table_changes: dict, last_pulled_at_ms: int) -> None:
    incoming_ids = [r["id"] for r in table_changes.get("created", [])] + [
        r["id"] for r in table_changes.get("updated", [])
    ]
    if not incoming_ids:
        return
    stale_ids = list(
        model.objects.filter(
            id__in=incoming_ids, updated_at__gt=_from_ms(last_pulled_at_ms)
        ).values_list("id", flat=True)
    )
    if stale_ids:
        raise SyncConflict(
            f"{model.__name__} record(s) modified server-side since last pull: {stale_ids}"
        )


def _apply_creates_updates(model, table_changes: dict, allowed_fields: set) -> None:
    for record in table_changes.get("created", []) + table_changes.get("updated", []):
        # Whitelist known fields so client-only columns (e.g. Post's
        # picture_local_uri, which never has meaning server-side) are
        # silently dropped rather than needing client-side exclusion logic.
        fields = {k: v for k, v in record.items() if k in allowed_fields}
        # Sanitize rather than reject an invalid status (matches the sync
        # protocol's "should not fail other than transiently" guidance) —
        # drop the field instead of writing garbage or 500ing the push.
        if "status" in fields and fields["status"] not in Status.values:
            del fields["status"]
        model.objects.update_or_create(id=record["id"], defaults=fields)


def _apply_deletes(model, ids: list, soft_delete_fn) -> None:
    for row in model.objects.filter(id__in=ids, is_deleted=False):
        soft_delete_fn(row)


def _push(request):
    try:
        body = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid JSON")

    changes = body.get("changes") or {}
    last_pulled_at_ms = int(body.get("lastPulledAt") or 0)
    jobs_changes = changes.get("jobs") or {}
    posts_changes = changes.get("posts") or {}

    try:
        with transaction.atomic():
            # Conflict pre-check across everything before writing anything —
            # all-or-nothing per push.
            _check_conflicts(Job, jobs_changes, last_pulled_at_ms)
            _check_conflicts(Post, posts_changes, last_pulled_at_ms)

            # Jobs before posts (FK ordering); creates/updates before
            # deletes (a record can't be soft-deleted before it exists).
            _apply_creates_updates(Job, jobs_changes, _JOB_FIELDS)
            _apply_creates_updates(Post, posts_changes, _POST_FIELDS)
            _apply_deletes(Job, jobs_changes.get("deleted", []), soft_delete_job)
            _apply_deletes(Post, posts_changes.get("deleted", []), soft_delete_post)
    except SyncConflict as exc:
        return JsonResponse({"error": str(exc)}, status=409)

    return JsonResponse({"ok": True})
