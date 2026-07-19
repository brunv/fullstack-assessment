# fullstack-assessment — agent context index

Turborepo monorepo modeled on the TrueRestore stack: Django GraphQL API +
Postgres + MinIO, a Next.js web client, and an Expo mobile client. This is a
job-interview assessment — the full challenge brief, evaluation criteria, and
submission requirements live in [README.md](README.md). This file and its
per-app companions are the agent-facing technical layer; they don't replace
the README, they sit alongside it.

## Per-app context

Read the relevant one before editing that app — each has structure, current
implementation state, and conventions specific to that stack:

- [apps/api/CLAUDE.md](apps/api/CLAUDE.md) — Django + graphene-django API
- [apps/web/CLAUDE.md](apps/web/CLAUDE.md) — Next.js web client
- [apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md) — Expo mobile client

## Stack

| Piece    | Tech                                            |
| -------- | ------------------------------------------------ |
| API      | Django, graphene-django, gunicorn                |
| Database | Postgres                                         |
| Storage  | MinIO (S3 API) via django-storages + boto3       |
| Web      | Next.js 14 (App Router), Apollo Client, Tailwind v4 |
| Mobile   | Expo, React Native, Apollo Client, WatermelonDB  |
| Monorepo | Turborepo + Yarn 1.x workspaces (`apps/web`, `apps/mobile`) |

`apps/api` is not a Yarn workspace — it's a standalone Django project run via
Docker or its own venv.

## Current status: scaffold only

Nothing in the Job/Post feature is built yet. Concretely, as of this writing:

- **API**: only a read-only `Project`/`Image` reference slice exists
  (`apps/api/core/`). Its `Mutation` class is empty — no mutations exist at
  all, including the `createProject`/`createPresignedUpload` examples shown
  in `apps/api/README.md` (those are illustrative, not implemented). No
  `Job`/`Post` models, no WatermelonDB sync endpoint.
- **Web**: bare Next.js scaffold. Apollo client is wired (`providers.tsx`),
  but there are no `components/`, `lib/`, or `graphql/` folders, no
  Jobs/Posts UI, no GraphQL operations defined anywhere.
- **Mobile**: bare Expo scaffold. WatermelonDB's *native* side is fully wired
  (babel decorators, Expo plugin, Android Gradle module) but `src/db/` and
  `src/screens/` are empty — no schema, no models, no sync logic, no
  navigation library chosen, no screens.

Building the `Job`/`Post` feature across all three layers (see "Data flow"
below) is the actual task. Don't assume any mutation, screen, or sync
mechanism exists — check the per-app CLAUDE.md and the code before relying on
it. Keep this section current as pieces land — see
`.claude/skills/update-context/SKILL.md`.

## Cross-cutting data flow: presigned MinIO uploads

This pattern spans all three apps and is the one to replicate for Post
pictures (reference implementation: `Project`/`Image` in `apps/api/core/`,
currently read-only):

1. `createPresignedUpload(filename, contentType)` → API returns a presigned
   **PUT** URL pointing at MinIO.
2. The client `PUT`s the file bytes **directly to MinIO** — the API never
   proxies the bytes.
3. `createPost(jobId, body, pictureKey, ...)` → API records the object key
   against the Post.
4. `Post.pictureUrl` resolves to a presigned **GET** URL for reading it back.

The mobile app applies the same pattern from its WatermelonDB sync worker:
local Posts with a `pictureLocalUri` upload their bytes to MinIO before the
push, then push only the resulting key.

Presigned URLs are signed against `MINIO_PUBLIC_ENDPOINT` (localhost:9000) so
the host matches what the browser/phone connects to, while the API reaches
MinIO over the Docker network at `minio:9000`. Full env var detail is in
[apps/api/CLAUDE.md](apps/api/CLAUDE.md).

## Monorepo commands

| Script             | Description                                        |
| ------------------- | --------------------------------------------------- |
| `yarn install`      | Install JS dependencies (Yarn 1.x workspaces)       |
| `yarn stack:up`     | Build and start all Docker services (API + infra)   |
| `yarn stack:down`   | Stop all services and remove volumes                |
| `yarn infra:up`     | Start just Postgres + MinIO (no API container)      |
| `yarn dev`          | Run web + mobile (auto-detects iOS/Android); does **not** manage Docker |
| `yarn dev:web`      | Next.js dev server only                             |
| `yarn dev:mobile`   | Build + run mobile only                             |
| `yarn lint` / `yarn typecheck` / `yarn build` | Turborepo pipelines across web + mobile |

`apps/api` has no Turborepo task wiring — run its commands directly (see
[apps/api/CLAUDE.md](apps/api/CLAUDE.md)).

## Env vars quick reference

- Web: `apps/web/.env.local` → `NEXT_PUBLIC_GRAPHQL_URL` (defaults to
  `http://localhost:8000/graphql/`)
- Mobile: no config needed normally — `yarn dev` runs `adb reverse` for
  Android; iOS simulator resolves `localhost` natively. Override with
  `EXPO_PUBLIC_GRAPHQL_URL` / `EXPO_PUBLIC_API_URL` only for a remote API.
- API: see [apps/api/CLAUDE.md](apps/api/CLAUDE.md) for the full list
  (`DATABASE_URL`, `MINIO_*`, `DJANGO_*`, `CORS_*`).
