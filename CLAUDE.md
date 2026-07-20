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

## Current status: Job/Post feature built across all three layers

- **API**: `Job`/`Post` models, GraphQL types/queries/mutations
  (`createJob`/`createPost`/`createPresignedUpload`/`deleteJob`/`deletePost`,
  soft-delete with server-side cascade), and the WatermelonDB sync endpoint
  (`/sync/`, pull+push, conflict-abort+retry, tombstone deletes) are all
  built and curl-verified, including the conflict-abort and cascade-delete
  paths. The `Project`/`Image` slice stays read-only as before. See
  `apps/api/CLAUDE.md`.
- **Mobile**: full offline-first Jobs/Posts feature — WatermelonDB
  schema/models/sync, bottom-tab navigation (Home tab: Home → JobDetails →
  PostDetails; Posts tab: AllPosts → PostDetails), create/delete UI with
  confirm dialogs, picture capture/pick with persistent local storage, sync
  triggers (create/delete, app-foreground, connectivity-restored,
  pull-to-refresh on every list screen — no header button), per-row
  cloud-slash indicators, an all-posts cross-job search screen (client-side
  filter, offline-capable), and toasts for error states. Confirmed to build,
  install, and boot cleanly on iOS Simulator with the correct local schema
  and API connectivity; full interactive tap-through wasn't driven by the
  agent (no touch-injection tooling in this session's sandbox — see
  `apps/mobile/CLAUDE.md`). See `apps/mobile/CLAUDE.md`.
- **Web**: full Jobs/Posts feature — a left sidebar (Home/Posts), Home (list
  + create + delete Job), `/jobs/[id]` (list + create + delete Post), and
  `/posts` (all posts across every job with a client-side description
  search, mirrors mobile's AllPosts screen) — the same presigned-MinIO-upload
  flow as mobile (synchronous here, no offline queueing needed), toasts
  (`sonner`) for every mutation/upload error path, loading/empty/error
  states throughout. No offline requirement for this layer per the README.
  `tsc --noEmit` passes clean and all routes compile and serve real
  API-backed data (curl-verified); no browser automation tool was available
  in this session to click through interactively — see `apps/web/CLAUDE.md`
  for the one pre-existing, unrelated tooling gap found (`yarn lint` broken
  by a Yarn 1 hoisting issue, not by this feature).

Two deliberate divergences from the literal README text, both documented
inline in code (see `apps/api/CLAUDE.md` for detail): (1) Job/Post picture
reads use a plain public URL, not a presigned GET, because the MinIO bucket
is public-read and a presigned URL's expiry would go stale against data
cached indefinitely on-device; (2) "conflict handling" in this pass means the
sync protocol correctly implements abort-on-stale-push + client retry-once —
true concurrent-edit conflicts aren't reachable yet since mobile only
creates/deletes (no field-level edit UI).

Keep this section current as pieces land — see
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
4. `Post.pictureUrl` resolves to a **plain public URL** (not a presigned
   GET — the bucket is public-read and sync payloads are cached indefinitely
   on-device, so an expiring URL would go stale; see
   `apps/api/core/storage.py`'s `public_url()`).

The mobile app applies this pattern from its WatermelonDB sync worker
(`apps/mobile/src/db/sync.ts`): local Posts with a `pictureLocalUri` upload
their bytes to MinIO in a pre-pass before `synchronize()` runs, then push
only the resulting key. The web app runs the same four steps synchronously
inside the create-post form (`apps/web/src/lib/uploadPicture.ts` +
`CreatePostDialog.tsx`) — no offline requirement, so no pre-pass/queueing is
needed.

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
