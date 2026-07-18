# Engineering Interview Challenge

A Turborepo monorepo modeled on the TrueRestore stack. It wires together a Django
GraphQL API, Postgres, MinIO (S3-compatible object storage), a Next.js web
client, and an Expo mobile client.

```
eng-interview/
├── apps/
│   ├── api/      Django + graphene-django (GraphQL), Postgres, MinIO storage
│   ├── web/      Next.js 14 (App Router) + Apollo Client
│   └── mobile/   Expo (React Native) + Apollo Client
├── docker-compose.yml   Postgres + MinIO + (optional) API
├── turbo.json           Turborepo task pipeline
└── package.json         Yarn workspaces (web + mobile)
```

## Stack

| Piece     | Tech                                            |
| --------- | ----------------------------------------------- |
| API       | Django, graphene-django, gunicorn               |
| Database  | Postgres                                        |
| Storage   | MinIO (S3 API) via django-storages + boto3      |
| Web       | Next.js, Apollo Client                          |
| Mobile    | Expo, React Native, Apollo Client, WatermelonDB |
| Monorepo  | Turborepo + Yarn workspaces                     |

## Prerequisites

- Docker + Docker Compose
- Node 20+ and Yarn 1.x (`corepack enable` or `npm i -g yarn`)
- Xcode (for iOS dev build) or Android Studio (for Android dev build)
- Python 3.12 (only if running the API outside Docker)

## Quick start

### 1. Install dependencies

```bash
yarn install
```

### 2. Start infrastructure + API (Docker)

```bash
yarn stack:up          # builds and starts all Docker services
```

This starts:

- **Postgres** on `localhost:5432`
- **MinIO** S3 API on `localhost:9000`, web console on `localhost:9001`
  (login `minioadmin` / `minioadmin`) — the `truerestore-media` bucket is created
  automatically.
- **Django API** on `localhost:8000` — GraphiQL at http://localhost:8000/graphql/

### 3. Start web + mobile

```bash
yarn dev
```

`yarn dev` only starts the **web** (http://localhost:3000) and **mobile** apps — it
does **not** touch Docker. Make sure step 2 (`yarn stack:up`) is already running in
another terminal first; if the API isn't reachable, `yarn dev` prints a warning but
still starts web + mobile (useful if you're pointing at a remote API).

The mobile app auto-detects your platform — it builds and launches on the **iOS simulator**
(macOS) or **Android emulator** (Linux/Windows). The first run takes a few minutes
to compile the native code.

To run them individually:

```bash
yarn dev:web           # Next.js only
yarn dev:mobile        # Mobile only (builds + launches simulator/emulator)
```

> **Note:** The mobile app uses WatermelonDB which requires native modules, so
> **Expo Go will not work** — the dev script builds a custom development client
> automatically.

### Environment variables

Point the clients at the API with env vars (defaults assume localhost:8000):

- web: `apps/web/.env.local` → `NEXT_PUBLIC_GRAPHQL_URL`
- mobile: no config needed — `yarn dev` runs `adb reverse` for the Android
  emulator/device so `localhost:8000` reaches the host. iOS simulator resolves
  `localhost` to the host natively. Override with `EXPO_PUBLIC_GRAPHQL_URL` /
  `EXPO_PUBLIC_API_URL` only if the API is on a different machine.

### Available scripts

| Script             | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `yarn stack:up`    | Build and start all Docker services (API + infra)        |
| `yarn stack:down`  | Stop all services and remove volumes                     |
| `yarn dev`         | Run web + mobile (auto-detects iOS/Android)              |
| `yarn dev:web`     | Run only the Next.js dev server                          |
| `yarn dev:mobile`  | Build + run mobile only                                  |

> `yarn dev` doesn't manage Docker — start the backend with `yarn stack:up`
> first (in another terminal).

## The demo flow (how the pieces connect)

Both clients can list Jobs, create Jobs, and add Posts (with pictures) to
them. Picture uploads demonstrate the full MinIO round-trip:

1. `createPresignedUpload(filename, contentType)` → API returns a **presigned PUT
   URL** pointing at MinIO.
2. The client `PUT`s the file bytes **directly to MinIO** (the API never proxies
   the bytes).
3. `createPost(jobId, body, pictureKey, ...)` → API records the object key
   against the Post.
4. `Post.pictureUrl` resolves to a **presigned GET URL** for reading it back.

The mobile app uses the same presigned pattern from its WatermelonDB sync
worker: local Posts with a `pictureLocalUri` upload their bytes to MinIO
before the push, then push only the resulting key.

> Presigned URLs are signed against `MINIO_PUBLIC_ENDPOINT` (localhost:9000) so
> the host matches what the browser/phone connects to, while the API itself
> reaches MinIO over the Docker network at `minio:9000`.

---

## AI usage requirement

**You are required to use an AI coding assistant** (e.g. Claude Code, GitHub
Copilot, Cursor, ChatGPT, etc.) throughout this challenge. This is not optional.

As part of your submission, **include your full AI conversation history** — either
as an exported chat log, a screen recording, or a shared session link. We want to
see how you leverage AI as a tool: how you prompt, how you iterate, and how you
apply critical thinking to AI-generated output.

We are **not** evaluating whether you can solve the problem without help. We are
evaluating how effectively you collaborate with AI to ship quality software.

---

## The challenge

Build a **Jobs feature** across the mobile app, the API, and the web app.

### What to build

- A **Job** has many **Posts**. A Post can include a **picture**.
- Both the **mobile app** and the **web app** can create Jobs and add Posts
  (with pictures) to them. Data created on either client shows up on the other
  after a sync/refresh.
- The mobile app must be **offline-first** using
  [WatermelonDB](https://watermelondb.dev/): the user can create Jobs and Posts
  (with pictures) **with no network connection**, reading and writing to a
  **local on-device database**. When connectivity returns, the app **syncs** its
  local data up to the API (creating the records server-side and uploading
  pictures to MinIO).
- The web app talks to the API directly (no offline requirement) — it uses the
  GraphQL mutations to create Jobs/Posts and the same presigned-MinIO-upload
  flow the mobile sync uses to attach pictures.
- Those Jobs and Posts are saved through the **Django GraphQL API**, with
  pictures stored in **MinIO**.
- Both clients also display the data — list Jobs and their Posts, and render
  each Post's picture.

> **WatermelonDB is already installed** and configured in the mobile app
> (including the Expo plugin, babel decorators, and native build properties).
> You only need to define your schema, models, and sync logic.

**Testing offline behavior:**
- **Android emulator:** toggle airplane mode in the emulator toolbar
- **iOS simulator:** turn off Wi-Fi on your Mac (the simulator shares the host network)
- Alternatively, stop the API with `docker compose stop api` to simulate server unavailability

### Expected scope

- **API (Django + graphene):** `Job` and `Post` models, GraphQL types, queries,
  and `createJob` / `createPost` mutations. A sync endpoint for WatermelonDB's
  [synchronize()](https://watermelondb.dev/docs/Sync/Intro) protocol (pull/push).
  Pictures land in MinIO — reuse the existing presigned-upload pattern
  (`createPresignedUpload` → direct `PUT` → attach).
- **Mobile (Expo):** Screens to create a Job, add Posts with pictures (capture
  or pick from gallery). WatermelonDB models/schema for Job + Post, offline
  create/read, and a sync implementation.
  **UI/UX matters** — design a clean, intuitive interface that feels like a real
  app, not a developer prototype. Think about navigation, loading states, empty
  states, and how the user flows from creating a Job to adding Posts.
- **Web (Next.js):** A polished view that lists Jobs and their Posts and also
  lets the user create Jobs and add Posts (with pictures uploaded through the
  same presigned-MinIO flow). Present the data in a clear, well-structured
  layout.

### What we're evaluating

- **Working end-to-end flow:** create on mobile → stored via API + MinIO →
  visible on web.
- **UI/UX quality:** We care about the user experience. A thoughtful layout,
  clear visual hierarchy, smooth interactions, and attention to detail
  (loading states, empty states, error handling) all count.
- **Offline-first correctness:** Reliable offline behavior and a robust sync
  implementation.
- **Clean data modeling** across the layers.
- **Code clarity**, and use of the existing scaffold patterns (Apollo, presigned
  uploads, GraphQL schema layout).

> The existing **Project/Image** slice is a reference implementation of the
> GraphQL + presigned-MinIO-upload flow — use it as a guide for the
> Job/Post/picture pieces.

### Go beyond

The requirements above are the baseline. If you have time and ideas, we
encourage you to expand the project with features or improvements of your own.
We value candidates who think like product engineers — not just completing
the spec, but asking "what would make this great?"

---

## Submission

When you're done:

1. Push your code to a Git repository and share the link.
2. **Include your AI chat log** (exported conversation). Submissions without an
   AI chat log will not be reviewed.

### Time expectation

You have **3 days** to complete and submit this challenge. The "go beyond"
section is open-ended — spend as much or as little time as you'd like.

We'd rather see a smaller scope done well than a large scope done poorly.
