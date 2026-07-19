# apps/api — Django + graphene-django

See also: [root CLAUDE.md](../../CLAUDE.md) for the cross-app data flow and
overall status. This file covers the API layer specifically.

## Stack

Django 4.2.16, graphene-django 3.2.2, gunicorn, Postgres via
`dj_database_url`, MinIO via `django-storages` (`S3Storage` backend) + boto3,
`django-cors-headers`. Python 3.12 (the Dockerfile uses `python:3.12-slim`).
No `pyproject.toml` — dependencies are pinned in `requirements.txt`.

## Structure

```
apps/api/
  config/        Django project: settings.py, urls.py, schema.py (root GraphQL schema), asgi.py, wsgi.py
  core/          Domain app: models.py, schema.py (GraphQL types/queries/mutations), storage.py (MinIO helpers), admin.py
  manage.py, requirements.txt, Dockerfile, entrypoint.sh
  .env.example   Host-run env vars (talks to db/minio on localhost)
  .env.docker    Compose-run env vars (db/minio hostnames)
```

## graphene-django wiring

- `config/schema.py` combines `core.schema.Query` / `core.schema.Mutation`
  into the root `schema`, referenced by `GRAPHENE = {"SCHEMA": ...}` in
  `config/settings.py`.
- `config/urls.py` mounts `graphql/` → `GraphQLView.as_view(graphiql=True)`
  (csrf-exempt), plus `admin/` and `health/`.

## Reference slice (read-only): Project/Image

`core/models.py`: `Project` (name, description, created_at) and `Image`
(FK → Project, `file` FileField on S3/MinIO storage, original_name,
content_type, uploaded_at).

`core/schema.py`: `ProjectType` / `ImageType` (graphene-django
`DjangoObjectType`), `ImageType.resolve_download_url` calls `presign_get`.
`Query` exposes `projects` / `project(id)`. No mutations touch these models —
this slice stays read-only.

**Note**: `apps/api/README.md`'s "Example queries" section shows
`createProject` and `createPresignedUpload` mutations against Project/Image.
These were never implemented for Project/Image specifically — only
`createPresignedUpload` exists (generic, used by Job/Post, see below).

## Job/Post feature (built)

`core/models.py`: `Job` (`id` client-generatable 16-char string PK via
`generate_client_id()`, `title`, `is_deleted`, `created_at`, `updated_at`) and
`Post` (same id scheme, FK → Job `related_name="posts"`, `description`,
`picture_key`, `picture_content_type`, `is_deleted`, `created_at`,
`updated_at`). **Deletes are soft** — `is_deleted` is a tombstone flag, never
a hard `DELETE`; see `soft_delete_job()`/`soft_delete_post()` in
`core/models.py` (the former cascades to the job's posts). `JobAdmin`/
`PostAdmin` in `core/admin.py` block the admin's hard-delete action via
`has_delete_permission`.

`core/schema.py`: `JobType`/`PostType` (`Query.jobs`/`Query.job(id)` filter
`is_deleted=False`; `JobType.resolve_posts` filters the reverse relation the
same way). Mutations: `createJob(title)`, `createPost(jobId, description,
pictureKey, pictureContentType)`, `createPresignedUpload(filename,
contentType)` (generic — reused for any picture), `deleteJob(id)`,
`deletePost(id)` (soft-delete, `deleteJob` cascades). **None of these are
mobile's primary write path** — mobile writes/deletes locally via
WatermelonDB and syncs through `core/sync.py` below; these mutations exist
for API completeness/testing and a future web client.

`core/storage.py` adds `public_url(key)` — a plain, non-expiring URL, used
for `PostType.picture_url` and the sync pull payload **instead of**
`presign_get`. The MinIO bucket is public-read (`mc anonymous set download`
in `docker-compose.yml`), and a presigned GET's ~1h expiry would go stale
against data cached indefinitely in the mobile app's local SQLite — `presign_get`
remains available but Job/Post reads deliberately don't use it. `presign_put`
is unaffected (uploads are one-shot/short-lived, presigning is correct there).

`core/sync.py`: the WatermelonDB `synchronize()` pull/push endpoint, mounted
at `path("sync/", csrf_exempt(sync_view))` in `config/urls.py` (GET = pull,
POST = push). Timestamps cross the wire as **epoch milliseconds**, not ISO
strings. **Pull's `created` bucket is intentionally always empty** — every
non-deleted changed row is reported as `updated`, paired with
`sendCreatedAsUpdated: true` on the mobile client's `synchronize()` call (see
`apps/mobile/src/db/sync.ts`). This avoids a real failure mode: a device can
create a record, push it, and then pull using its pre-push checkpoint (e.g.
after a partial failure/retry) — classifying that row as `created` makes
WatermelonDB warn/reject because the local record already exists; reporting
it as `updated` keeps that flow idempotent while still correctly
materializing genuinely-missing rows on other devices. Push does an
all-or-nothing conflict pre-check (`transaction.atomic`) per WatermelonDB's
backend contract — a pushed record whose server `updated_at` moved past the
client's `lastPulledAt` aborts the whole push (409); the mobile client
retries once (re-pull, re-push). Deletes arrive as id lists and are applied
via the same soft-delete helpers as the GraphQL mutations. Verified
end-to-end via curl: fresh pull, valid push, stale-push abort (409),
delete→tombstone round trip, and job-delete cascading to its posts even when
the push only names the job id.

True concurrent-edit conflicts are unreachable in the current mobile UI
(create/delete only, no field-level edit), so the abort/retry path is real
but is exercised via retry-after-partial-failure, not concurrent multi-device
edits — see root `CLAUDE.md` for the fuller rationale.

## Settings / env vars (`config/settings.py`)

- DB: `DATABASE_URL` (default `postgres://truerestore:truerestore@localhost:5436/truerestore`)
- MinIO/S3: `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`,
  `MINIO_ENDPOINT` (internal, e.g. `minio:9000` in Docker),
  `MINIO_PUBLIC_ENDPOINT` (external, `localhost:9000` — what presigned URLs
  are signed against so the browser/phone can reach them), `AWS_REGION`
- Django: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- CORS: `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_ALL_ORIGINS`

Full values for local dev are in `.env.example` (host) / `.env.docker`
(compose).

## Running

**Docker** (recommended, from repo root): `docker compose up --build` (or
`yarn stack:up`). API on `localhost:8000`, migrations applied automatically
by `entrypoint.sh`.

**Host**:
```bash
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# infra must be up: yarn infra:up (from repo root)
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

GraphiQL: http://localhost:8000/graphql/ · Health: http://localhost:8000/health/
· Admin: http://localhost:8000/admin/ (`python manage.py createsuperuser`)

Migrations: `core/migrations/0001_initial.py` (Project/Image),
`0002_job_post.py` (Job/Post) — new fields need a new migration as usual.

## Conventions

No tests exist yet (no pytest config, no `test_*.py`). No lint/format tooling
configured (no ruff/black/flake8/mypy config) — don't invent config files for
this speculatively; if you add tests or linting, note it here.
