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

## Existing reference slice (read-only)

`core/models.py`: `Project` (name, description, created_at) and `Image`
(FK → Project, `file` FileField on S3/MinIO storage, original_name,
content_type, uploaded_at).

`core/schema.py`: `ProjectType` / `ImageType` (graphene-django
`DjangoObjectType`), `ImageType.resolve_download_url` calls `presign_get`.
`Query` exposes `projects` / `project(id)`. **`Mutation` is empty**
(`class Mutation(graphene.ObjectType): pass`) — no mutations exist in this
codebase at all yet.

`core/storage.py`: `presign_put(key, content_type, expires)` and
`presign_get(key, expires)` — boto3 helpers signed against the public MinIO
endpoint.

**Important**: `apps/api/README.md`'s "Example queries" section shows
`createProject` and `createPresignedUpload` mutations. These are
**aspirational/illustrative** — they show the pattern to build, they are not
callable today. Don't assume they exist; grep `core/schema.py` before relying
on any mutation.

## What needs building

- `Job` and `Post` models (Post has an optional picture, FK to Job)
- `JobType` / `PostType` GraphQL types
- `createJob`, `createPost`, `createPresignedUpload` mutations (the upload
  mutation belongs to the same pattern as `presign_put`/`presign_get` above,
  just not implemented yet for any model)
- A WatermelonDB sync endpoint implementing the
  [synchronize() pull/push protocol](https://watermelondb.dev/docs/Sync/Intro)

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

Migrations: single `core/migrations/0001_initial.py` so far — new
models/mutations need a new migration.

## Conventions

No tests exist yet (no pytest config, no `test_*.py`). No lint/format tooling
configured (no ruff/black/flake8/mypy config) — don't invent config files for
this speculatively; if you add tests or linting, note it here.
