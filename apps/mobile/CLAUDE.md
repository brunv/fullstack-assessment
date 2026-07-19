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
    db/
      schema.ts               WatermelonDB appSchema: jobs, posts tables (snake_case, mirrors API fields)
      models/Job.ts, Post.ts   Model classes (@field/@date/@children/@relation decorators)
      index.ts                 SQLiteAdapter + Database singleton, jobsCollection/postsCollection
      mutations.ts             createJob/createPost/deleteJob(cascade)/deletePost/updatePostPictureKey
      sync.ts                  syncDatabase(): picture pre-pass → synchronize() with retry-once, in-flight guard
    sync/
      SyncContext.tsx          useSync() hook: status (synced/pending/syncing), triggerSync(), AppState + NetInfo triggers
      SyncHeaderButton.tsx      nav-header icon reflecting sync status
    navigation/
      types.ts, RootNavigator.tsx   native-stack: Home, JobDetails, PostDetails
    screens/
      HomeScreen.tsx            Job list (observed), FAB → create modal, delete w/ confirm
      JobDetailsScreen.tsx      Post list for a job (rows tappable → PostDetails), add-post button, delete w/ confirm
      PostDetailsScreen.tsx     Full-size image + description for one post, observed by id
      components/JobRow.tsx, PostRow.tsx, CreatePostModal.tsx
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

## Sync status UI & triggers (`src/sync/SyncContext.tsx`)

`useSync()` exposes `status: 'synced' | 'pending' | 'syncing'` (derived by
observing `Q.where('_status', Q.notEq('synced'))` counts on both
collections) and `triggerSync({ silent? })`. Background triggers (create,
delete, `AppState` → `active`, `NetInfo` offline→online transition) pass
`silent: true` and skip quietly when offline (expected state, not an error —
already visible via the pending/cloud-slash icons). The manual header button
(`SyncHeaderButton.tsx`) passes no options, so it shows an info toast if
offline. Row-level cloud-slash icons (`JobRow`/`PostRow`) read
`record.syncStatus !== "synced"` directly — re-renders naturally since the
parent `.observe()` re-emits on any status change.

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
