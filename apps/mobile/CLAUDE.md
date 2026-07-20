# apps/mobile — Expo client

See also: [root CLAUDE.md](../../CLAUDE.md) for the cross-app data flow and
overall status. This file covers the mobile layer specifically.

## Stack

Expo ~55.0.27, React Native 0.83.6, React 19.2.0, TypeScript ~5.9.2,
WatermelonDB ^0.28.0 (offline-first local DB), Apollo Client. Must run via a
custom dev client (`expo-dev-client`) — **Expo Go will not work** because of
WatermelonDB's native modules.

## Structure

```
apps/mobile/
  App.tsx                Provider stack (SafeArea → Apollo → WatermelonDB DatabaseProvider →
                          SyncProvider → RootNavigator) + <Toast/> mounted at root
  index.ts                Expo entry point (registerRootComponent)
  src/
    apollo.ts               Apollo Client, wired into App.tsx
    config.ts                GRAPHQL_URL / SYNC_URL (EXPO_PUBLIC_GRAPHQL_URL / EXPO_PUBLIC_API_URL)
    theme.ts                 colors/spacing/radius constants shared by all screens
    status.ts                 Status type ("new"|"in_progress"|"complete") + STATUS_VALUES/STATUS_LABELS
    db/
      schema.ts               WatermelonDB appSchema (version 2): jobs, posts tables (snake_case, mirrors API fields)
      migrations.ts             schemaMigrations: v1→v2 adds `status` column to both tables + SQL backfill to "new"
      models/Job.ts, Post.ts   Model classes (@field/@date/@children/@relation decorators)
      index.ts                 SQLiteAdapter + Database singleton, jobsCollection/postsCollection
      mutations.ts             createJob/createPost/deleteJob(cascade)/deletePost/updatePostPictureKey/updateJobStatus/updatePostStatus
      sync.ts                  syncDatabase(): picture pre-pass → synchronize() with retry-once, in-flight guard
    sync/
      SyncContext.tsx          useSync() hook: status (synced/pending/syncing), triggerSync(), AppState + NetInfo triggers
    navigation/
      types.ts                  HomeStackParamList, PostsStackParamList (both share PostDetailsParams), RootTabParamList
      RootNavigator.tsx          bottom-tab root (HomeTab, PostsTab) — see "Navigation" below
      HomeStackNavigator.tsx      native-stack: Home → JobDetails → PostDetails
      PostsStackNavigator.tsx     native-stack: AllPosts → PostDetails
    screens/
      HomeScreen.tsx            Job list filtered by New/In Progress/Complete tabs, FAB → create modal, delete w/ confirm
      JobDetailsScreen.tsx      One combined Post list for a job (sorted by status, not tabbed), add-post button, delete w/ confirm
      PostDetailsScreen.tsx     Full-size image + job title + description for one post, observed by id (shared by both stacks)
      AllPostsScreen.tsx        Cross-job Post search (PostsTab) — text search over description, one flat list
      components/JobRow.tsx, PostRow.tsx, PostSearchRow.tsx, CreatePostModal.tsx,
                 StatusBadge.tsx (read-only tag), StatusPicker.tsx (dual-purpose 3-way control — edit or filter, see "Status" below)
    utils/
      pickImage.ts              camera/library pick → resize/compress → persist to FileSystem.documentDirectory
      formatRelativeTime.ts
  android/, ios/          Native projects, gitignored (generated via Expo prebuild) — don't hand-edit
```

## WatermelonDB (fully wired: native + schema + sync)

Native side (pre-existing, unchanged): `@nozbe/watermelondb` +
`@lovesworking/watermelondb-expo-plugin-sdk-52-plus` in `package.json`, Expo
config plugin in `app.json`, babel legacy decorators in `babel.config.js`
(also required `experimentalDecorators: true` in `tsconfig.json` — TS doesn't
infer this from babel config), Android Gradle module, `metro.config.js`
blocklisting `.cxx/**`.

App side (`src/db/`): `schema.ts` defines `jobs`/`posts` with snake_case
columns matching the API's Job/Post fields closely (so the sync payload
passes through with minimal mapping). `created_at`/`updated_at` use
WatermelonDB's auto-managed-timestamp convention (`@readonly @date(...)`
properties named exactly `createdAt`/`updatedAt` — the library sets/bumps
them automatically on create/update, see `Model/helpers.js`'s
`createTimestampsFor`). `posts.picture_local_uri` is a device-local field
(persisted photo path, see `utils/pickImage.ts`) that gets pushed like any
column but the server's field whitelist (`apps/api/core/sync.py`) silently
drops it. `posts.picture_url` is populated only by pull. Display rule
everywhere: prefer `pictureLocalUri`, fall back to `pictureUrl`.

`src/db/mutations.ts`: `deleteJob` fetches the job's currently-loaded posts
and marks job + posts deleted in one `database.batch()` (WatermelonDB's
default queries already exclude `_status === 'deleted'` records, so no manual
filtering needed elsewhere) — the API's server-side cascade
(`soft_delete_job`) is a backstop if this batch is interrupted.

`src/db/sync.ts`: `syncDatabase()` — guarded by a module-level in-flight
promise (concurrent triggers coalesce into one sync). Order: picture
upload pre-pass (each item's failure isolated via try/catch, never throws
out of the pre-pass) → `synchronize()` wrapped in a retry-once block per
WatermelonDB's documented recommendation for the abort-on-conflict case.
`synchronize()` is called with `sendCreatedAsUpdated: true`, paired with the
API's pull always reporting `created` as empty (`apps/api/core/sync.py`) — a
record created-then-pushed-then-repulled-from-a-stale-checkpoint would
otherwise be misclassified as a fresh `created` row and rejected by
WatermelonDB as already existing locally.

**Every network call in the sync path goes through `utils/fetchWithTimeout.ts`**
(pull, push, the picture PUT, and — via `apollo.ts`'s `HttpLink({ fetch:
fetchWithTimeout })` — the `createPresignedUpload` mutation too). React
Native's `fetch` has no built-in timeout: a stalled request (flaky network,
server accepts the connection but never responds) leaves that promise
pending forever, which means `performSync()` never resolves *or* rejects,
`syncDatabase()`'s promise never settles, and `SyncContext`'s `isSyncing`
never gets reset by `triggerSync`'s `.finally()` — every list screen's
pull-to-refresh spinner (bound to `status === "syncing"`) is stuck
indefinitely, on every screen, until app restart. Bug, not theoretical — hit
this exact symptom ("spinner freezes, nothing else shown" on Home) and this
was the fix. Default timeout is 20s; a timeout surfaces as a normal rejected
promise (caught by the retry-once wrapper / per-item try/catch same as any
other sync failure), not a special case.

## Sync status UI & triggers (`src/sync/SyncContext.tsx`)

`useSync()` exposes `status: 'synced' | 'pending' | 'syncing'` (derived by
observing `Q.where('_status', Q.notEq('synced'))` counts on both
collections) and `triggerSync({ silent? })`. Background triggers (create,
delete, `AppState` → `active`, `NetInfo` offline→online transition) pass
`silent: true` and skip quietly when offline (expected state, not an error —
already visible via the pending/cloud-slash icons). Manual trigger is
**pull-to-refresh** on `HomeScreen`/`JobDetailsScreen` — no
`silent`, so it shows an info toast if offline — via a shared `refreshControl` element
(`refreshing={status === "syncing"}`, `onRefresh={() => triggerSync()}`)
passed to whichever container is currently rendered. Both screens branch on
`list.length === 0`: with items, a `FlatList` renders normally; empty, a
plain `ScrollView` (`contentContainerStyle: styles.emptyList`, `flexGrow: 1`)
wraps the empty-state `View` instead. This isn't just for centering —
`FlatList`'s `ListEmptyComponent` + `refreshControl` does **not** reliably
register the pull gesture when there's no data (a known RN quirk); a real
`ScrollView` does, regardless of content size, so the empty case gets its
own scrollable container rather than relying on `ListEmptyComponent`. Both
the `FlatList` and the `ScrollView` also need an explicit `style={styles.scrollFill}`
(`flex: 1`) in addition to `contentContainerStyle` — without it, either
component sizes itself to its *content* height rather than filling the
screen, so with only a couple of short rows the pullable/refreshable area is
just that small strip at the top and the rest of the screen is bare
`container` background with no gesture handling at all (pull-to-refresh
"only works right on an item"). Row-level cloud-slash icons
(`JobRow`/`PostRow`) read `record.syncStatus !== "synced"`
directly — re-renders naturally since the parent `.observe()` re-emits on
any status change.

## Navigation: bottom tabs + two stacks

`RootNavigator.tsx` is a `@react-navigation/bottom-tabs` root with two tabs:
**HomeTab** (`HomeStackNavigator`: Home → JobDetails → PostDetails) and
**PostsTab** (`PostsStackNavigator`: AllPosts → PostDetails). `PostDetails`
is registered in *both* stacks (reachable from a Job's post list or from the
global search), so `PostDetailsScreen` is typed against the shared
`PostDetailsParams` param shape (`navigation/types.ts`) rather than either
stack's full param list — it only reads `route.params`, never navigates
itself, so it doesn't need to know which stack it's mounted in.

**Do not confuse this with status filtering** — a past miscommunication led
to this nav bar being removed by mistake while chasing an unrelated request
to drop a status *tab view*. The two are unrelated: this bottom-tab bar is
top-level app navigation (Home vs. Posts destinations); the status tabs
described below are a client-side filter *within* the Home screen's Job
list. Don't remove this navigator without an explicit, unambiguous request
to do so.

## Status (Job + Post)

`src/status.ts` is the single source of truth for the 3 values
(`"new" | "in_progress" | "complete"`) — mirrors `apps/api/core/models.py`'s
`Status` TextChoices and `apps/web/src/lib/status.ts` (three separate files
by necessity, no shared package between the apps in this monorepo, but keep
them in sync if the value set ever changes). Every `createJob`/`createPost`
sets `status = "new"` explicitly in `db/mutations.ts` — WatermelonDB column
definitions have no per-column default (unlike Django), so this has to be
set at create time, not declared in `schema.ts`. `STATUS_PRIORITY`/
`compareByStatus` (also in `status.ts`) rank `new` < `in_progress` <
`complete`, for sorting — not filtering.

Status shows up in the UI two different ways, deliberately not the same
pattern in both places:
- **`HomeScreen`**: the Job list is split into three tabs (New / In
  Progress / Complete, `StatusPicker` reused as a filter control — see
  below), default tab `"new"`. There's exactly **one** WatermelonDB
  subscription behind all three tabs (`jobsCollection.query(...).observe()`
  in a single `useEffect`); switching tabs only changes a local
  `useMemo`-filtered view over that same array. This matters for
  pull-to-refresh: the single `refreshControl` on the screen always triggers
  one full `triggerSync()` regardless of which tab is active — there's
  nothing to accidentally scope "per tab" because the tabs were never
  separate data sources or separate screens to begin with.
- **`JobDetailsScreen`**: a Job's posts are **not** tabbed — one combined
  list, sorted `new > in_progress > complete` (`compareByStatus`, secondary
  sort newest-first within a status) via a small `sortPosts()` helper
  wrapping the `foundJob.posts.observe()` subscription.

`StatusBadge.tsx` (read-only tag, used in `JobRow`/`PostRow`/`PostSearchRow`)
is purely presentational. `StatusPicker.tsx` (3-segment control) is used for **two
different purposes** depending on where it's mounted — editing a single
record's status (`JobDetailsScreen` for the Job, `PostDetailsScreen` for the
Post — status is only ever *edited* from a detail screen, never from a list
row) vs. filtering Home's Job list (a plain local `useState<Status>`, no
persistence, no WatermelonDB write). Same component either way — its props
(`status`, `onChange`, `disabled?`) don't encode which mode it's in, that's
purely up to what the caller does in `onChange`. Both detail screens
re-observe their subject (`foundJob.observe().subscribe(setJob)` / existing
`post.observe()`) specifically so an edit re-renders — `.update()` mutates
the WatermelonDB model in place, which doesn't itself trigger a React
re-render without a subscription. `updateJobStatus`/`updatePostStatus`
(`db/mutations.ts`) are plain local writes like any other mutation here, then
`triggerSync({ silent: true })` — no direct GraphQL call, consistent with
mobile's local-first-then-sync write path for everything else.

**Schema migration**: bumping `schema.ts` to `version: 2` without a
migration would make WatermelonDB refuse to open any existing local
database (schema-version mismatch). `db/migrations.ts` uses
`schemaMigrations` (`addColumns` on both tables + `unsafeExecuteSql` to
backfill any pre-existing NULL `status` to `"new"`, since SQLite
`ALTER TABLE ADD COLUMN` has no per-row default), wired into the
`SQLiteAdapter` via its `migrations` option in `db/index.ts`. Confirmed via
`sqlite3` on the simulator's `watermelon.db` that the resulting schema is
correct post-migration; the specific migrate-from-existing-v1-data code path
wasn't deterministically re-exercised in this session (the simulator's app
container had already been reset between checks, for reasons outside this
session's control) — the migration steps themselves are written directly
against WatermelonDB's documented/typed `schemaMigrations` API, not
guessed.

## Image capture/picker

`expo-image-picker` + `expo-image-manipulator` (resize to 1600px wide,
compress, JPEG) + `expo-file-system`'s `File`/`Directory`/`Paths` classes
(SDK 55's new API, not the legacy `documentDirectory` string API) to persist
into `Paths.document` — picker/camera results land in a cache dir the OS can
purge, so a picture captured offline could otherwise vanish before syncing.
`expo-image` (not bare RN `Image`) is used for display. No `expo-camera`
installed (not needed — `launchCameraAsync` covers capture).

## Running

```bash
yarn dev:mobile      # from repo root — auto-detects iOS/Android
# or, from within apps/mobile:
yarn dev             # scripts/dev.sh — handles ANDROID_HOME/JAVA_HOME, emulator boot, adb reverse, Metro
yarn android         # expo run:android
yarn ios             # expo run:ios
```

Requires the API stack up (`yarn stack:up` from repo root).

**Gotcha**: if `npx expo run:ios`'s `pod install` step fails with a Ruby
`UnicodeNormalize`/`ASCII-8BIT` error, the shell's `LANG` isn't set to UTF-8
(`locale` shows blank) — `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` before
retrying (either inline or run `pod install` directly in `ios/` with those
vars set, then re-run `expo run:ios`).

Verified end-to-end on iOS Simulator: app boots cleanly (no runtime errors),
WatermelonDB creates the correct `jobs`/`posts` SQLite schema on first launch
(confirmed via `sqlite3` on the simulator's `watermelon.db`), and the
simulator reaches the Dockerized API at `localhost:8000` with no proxy setup
needed (matches the README's stated iOS behavior). Full interactive
click-through (tapping the FAB, creating a Job, syncing) wasn't driven by the
agent in this session — the sandboxed dev environment had no touch-injection
path (no Accessibility/Automation permission for AppleScript, no `idb`).

## Conventions

No tests exist yet. `lint` script is currently a stub (no real ESLint
config). `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`
and `experimentalDecorators: true` (added for WatermelonDB's decorators).
