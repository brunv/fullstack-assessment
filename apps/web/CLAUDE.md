# apps/web — Next.js client

See also: [root CLAUDE.md](../../CLAUDE.md) for the cross-app data flow and
overall status. This file covers the web layer specifically.

## Stack

Next.js 14.2.13 (App Router), React 18.3.1, Apollo Client 3.11.8, Tailwind
CSS v4 (`@tailwindcss/postcss`), `sonner` (toasts), `lucide-react` (icons).
TypeScript (strict, `moduleResolution: bundler`, `@/*` → `./src/*`). No
GraphQL codegen (operations are hand-typed), no test runner configured.

## Structure

```
apps/web/
  .env.local              NEXT_PUBLIC_GRAPHQL_URL (untracked, gitignored)
  src/
    app/
      layout.tsx             RootLayout: <Sidebar> (Home/Posts nav) + <Providers>, <Toaster/> (sonner)
      page.tsx                Home: Jobs list filtered by New/In Progress/Complete tabs, create/delete Job
      providers.tsx            Apollo client/provider setup
      globals.css               imports tailwindcss + theme.css, sets body bg/color
      theme.css                  Tailwind v4 @theme design tokens (colors, spacing, radii) — wired in
      jobs/[id]/page.tsx        Job details: one combined Posts list sorted by status, add/delete Post
      posts/page.tsx             Cross-job Post search (Sidebar's "Posts" destination) — text search over description
    graphql/operations.ts    gql queries/mutations + hand-written TS types (Job, Post, Status, PostJob, ...)
    lib/
      uploadPicture.ts         presign → PUT to MinIO → returns {key, contentType}
      status.ts                 STATUS_VALUES / STATUS_LABELS / STATUS_PRIORITY / compareByStatus (mirrors apps/mobile/src/status.ts)
    components/
      Modal.tsx, EmptyState.tsx, Skeleton.tsx   generic UI primitives (Modal takes a size: "md" | "lg" prop)
      Sidebar.tsx                                 left nav: Home / Posts links
      StatusBadge.tsx, StatusSelect.tsx          read-only tag vs. dual-purpose 3-way control (mirrors mobile's pair — see "Status" below)
      JobCard.tsx, PostCard.tsx, PostSearchCard.tsx  list row presentational components (PostCard/PostSearchCard rows are clickable → detail modal)
      CreateJobDialog.tsx, CreatePostDialog.tsx  self-contained forms (own mutation + refetch)
      PostDetailModal.tsx                        size="lg" Modal: image + job title (when opened from AllPosts search) + description + StatusSelect
```

There is no Project/Image reference UI on the web side (that slice is
server-only, read-only in `apps/api/core/`) — the Jobs/Posts UI above is
built directly against the API's `Job`/`Post` GraphQL surface
(`apps/api/CLAUDE.md`).

## Apollo Client

`src/app/providers.tsx`: unchanged from scaffold — `ApolloClient` with
`HttpLink` (`uri: NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql/"`)
and `InMemoryCache`, memoized via `useMemo`, wrapped as `ApolloProvider` in
`layout.tsx`. No split links, no error link, no auth.

Data flow uses plain `useQuery`/`useMutation` with `refetchQueries` (not
manual cache updates) — simplest correct approach for this dataset size, no
optimistic UI. `fetchPolicy: "cache-and-network"` on both list queries so a
revisit shows cached data instantly while revalidating.

## Job/Post feature (built)

- **Home** (`src/app/page.tsx`): `JOBS_QUERY`, `CreateJobDialog` (title only),
  delete via `window.confirm` + `deleteJob` mutation (server cascades to
  posts). Loading skeletons, error state, empty state with CTA.
- **Job details** (`src/app/jobs/[id]/page.tsx`): `JOB_QUERY`, `CreatePostDialog`
  (optional description + optional picture), delete via `window.confirm` +
  `deletePost`. No job-delete button here — matches mobile's parity (job
  deletion lives on the list, not the detail screen).
- **Post detail** (`PostDetailModal.tsx`, opened from `PostCard`'s row click):
  full-size image + full description in a `size="lg"` Modal, mirrors mobile's
  `PostDetailsScreen`. `PostCard`'s outer element is a `div role="button"`
  (not a `<button>`) specifically because it contains a nested delete
  `<button>` — buttons can't nest in valid HTML; the delete button's
  `onClick` calls `event.stopPropagation()` so deleting doesn't also open
  the detail modal.
- **Picture upload** (`src/lib/uploadPicture.ts` + `CreatePostDialog.tsx`):
  same presigned-MinIO flow as mobile — `createPresignedUpload` mutation →
  `fetch(uploadUrl, {method:'PUT', body: file})` directly to MinIO → `createPost`
  with the resulting `pictureKey`/`pictureContentType`. No offline
  requirement, so this runs synchronously in the create-post form (no
  pre-pass/queueing needed like mobile's sync worker).
- **Posts search** (`src/app/posts/page.tsx`): `ALL_POSTS_QUERY` (every Post
  across every Job, `job { id title }` included so `PostSearchCard` can show
  which Job each result belongs to), filtered client-side by a plain text
  query against `description`. Opens the same `PostDetailModal` as Job
  details' post list.
- Errors at any step (`createJob`, `createPost`, `deleteJob`, `deletePost`,
  the presign call, the MinIO `PUT`) surface as a `sonner` toast
  (`toast.error(...)`) — no silent failures, no blocking `alert()`.

No delete-confirmation modal component — uses the browser's native
`window.confirm()`, mirroring mobile's use of the native `Alert.alert`.

## Status (Job + Post)

`src/lib/status.ts` + the `Status` type in `graphql/operations.ts` are the
single source of truth (`"new" | "in_progress" | "complete"`) — mirrors
`apps/api/core/models.py`'s `Status` TextChoices and
`apps/mobile/src/status.ts` (three separate files by necessity, no shared
package between the apps in this monorepo). `STATUS_PRIORITY`/
`compareByStatus` rank `new` < `in_progress` < `complete`, for **sorting**
(Job details) — Home uses filtering instead, see below. Every Job/Post
starts `"new"` (server-side model default; `createJob`/`createPost`'s
selection sets include `status` so it's in the cache from the moment of
creation, not just after a refetch).

`StatusSelect` (3-segment control) is used for **two different purposes**
depending on where it's mounted, same component either way — its props
(`status`, `onChange`, `disabled?`) don't encode which mode it's in:
- **`page.tsx` (Home)**: filters the Job list into three tabs, backed by a
  plain `useState<Status>("new")` and a `useMemo` filter over the single
  `JOBS_QUERY` result — not three separate queries, so there's only ever one
  thing to refetch/revalidate regardless of which tab is active.
- **`jobs/[id]/page.tsx`** (editing the Job's own status) and inside
  **`PostDetailModal.tsx`** (editing the Post's status, wired directly in
  the modal since it's the only place Post status is edited) — status is
  only ever *edited* from a detail view, never from a list row; list rows
  (`JobCard`/`PostCard`/`PostSearchCard`) only ever render the read-only
  `StatusBadge`. A
  Job's Post list (`jobs/[id]/page.tsx`) is **not** tabbed like Home's Job
  list — one combined array, sorted client-side
  (`[...data.job.posts].sort((a,b) => compareByStatus(a,b) || ...)`) rather
  than filtered, so all of a job's posts are visible at once regardless of
  status.

**Deliberate exception to this file's usual `refetchQueries` convention**:
`UPDATE_JOB_STATUS`/`UPDATE_POST_STATUS` use neither `refetchQueries` nor a
manual `update` function. Their selection sets return `id` + `status`, and
since every list/detail query also requests `id` on these entities, Apollo's
default `InMemoryCache` normalizes by `__typename:id` and patches the field
everywhere that entity is currently rendered from cache — Home's job card
and the job-details post list both update from a single mutation with zero
extra network requests. This only works because status editing changes a
field on an *existing* entity, not list membership; creates/deletes still
need `refetchQueries` because adding/removing a row isn't something
field-level cache normalization can infer on its own.

## Navigation

`layout.tsx` renders a persistent left `Sidebar` (`Home` / `Posts` links)
alongside `{children}`. `Home` (`/`) is the Job list; `Posts` (`/posts`) is
`AllPostsScreen`'s web counterpart — a flat, searchable list of every Post
across every Job (`ALL_POSTS_QUERY`, filtered client-side by a text query
against `description`). `/jobs/[id]` is reached only via a `JobCard` click
from Home; there's no other route into it.

**Do not confuse this with status filtering** — a past miscommunication led
to this Sidebar being removed by mistake while chasing an unrelated request
to drop a status *tab view*. The two are unrelated: the Sidebar is top-level
app navigation (Home vs. Posts destinations); the status tabs described
below are a client-side filter *within* the Home page's Job list. Don't
remove the Sidebar without an explicit, unambiguous request to do so.

## Running

```bash
yarn dev:web        # from repo root, or `yarn dev` inside apps/web
```

Dev server: http://localhost:3000 (port 3000). Requires the API stack up
(`yarn stack:up` from repo root) to actually fetch data — `yarn dev` prints a
warning but still starts if the API isn't reachable.

Scripts (`apps/web/package.json`): `dev` (`next dev -p 3000`), `build`,
`start` (`next start -p 3000`), `lint` (`next lint`), `typecheck` (`tsc
--noEmit`).

Verified via `tsc --noEmit` (clean) and the dev server (`/` and `/jobs/[id]`
both compile and return 200, confirmed against real API-created test data via
curl). No browser automation tool was available in this session to click
through the UI interactively (open forms, pick a file, watch a toast) — do
that manually if you want visual confirmation, the dev server is a plain
`localhost:3000` open-a-tab away (lower friction than mobile's simulator).

**Known gap, not caused by this feature**: `yarn lint` fails with `Cannot
find module 'next/dist/compiled/babel/eslint-parser'` — a pre-existing Yarn 1
workspace hoisting issue (root `node_modules` has no `next` at all; it's only
nested under `apps/web/node_modules`, but `eslint-config-next` is hoisted to
root and can't resolve into the sibling folder). Confirmed present even after
a fresh `yarn install` from repo root; `tsc --noEmit` is unaffected and passes
clean. Fixing the hoisting (e.g. a root `nohoist` config) is a separate,
pre-existing scaffold issue.

## Conventions

No tests exist yet. No Prettier config file despite `prettier` being a root
devDependency (unconfigured). No codegen — GraphQL operations are hand-typed
in `src/graphql/operations.ts`; if you add graphql-codegen, note it here.
