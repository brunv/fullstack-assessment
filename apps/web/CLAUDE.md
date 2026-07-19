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
      layout.tsx             RootLayout: header bar, <Providers>, <Toaster/> (sonner)
      page.tsx                Home: Jobs list, create/delete Job
      providers.tsx            Apollo client/provider setup
      globals.css               imports tailwindcss + theme.css, sets body bg/color
      theme.css                  Tailwind v4 @theme design tokens (colors, spacing, radii) — wired in
      jobs/[id]/page.tsx        Job details: Posts list, add/delete Post
    graphql/operations.ts    gql queries/mutations + hand-written TS types (Job, Post, ...)
    lib/uploadPicture.ts     presign → PUT to MinIO → returns {key, contentType}
    components/
      Modal.tsx, EmptyState.tsx, Skeleton.tsx   generic UI primitives (Modal takes a size: "md" | "lg" prop)
      JobCard.tsx, PostCard.tsx                  list row presentational components (PostCard row is clickable → detail modal)
      CreateJobDialog.tsx, CreatePostDialog.tsx  self-contained forms (own mutation + refetch)
      PostDetailModal.tsx                        size="lg" Modal showing a post's full image + description
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
- Errors at any step (`createJob`, `createPost`, `deleteJob`, `deletePost`,
  the presign call, the MinIO `PUT`) surface as a `sonner` toast
  (`toast.error(...)`) — no silent failures, no blocking `alert()`.

No delete-confirmation modal component — uses the browser's native
`window.confirm()`, mirroring mobile's use of the native `Alert.alert`.

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
