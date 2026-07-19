# apps/mobile — Expo client

See also: [root CLAUDE.md](../../CLAUDE.md) for the cross-app data flow and
overall status. This file covers the mobile layer specifically.

## Stack

Expo ~55.0.27, React Native 0.83.6, React 19.2.0, TypeScript ~5.9.2,
WatermelonDB ^0.28.0 (offline-first local DB), Apollo Client. Must run via a
custom dev client (`expo-dev-client`) — **Expo Go will not work** because of
WatermelonDB's native modules.

## Structure (as it exists today — bare scaffold)

```
apps/mobile/
  App.tsx             Root component — currently just a static placeholder screen, no navigation wired
  index.ts             Expo entry point (registerRootComponent)
  src/
    apollo.ts           Apollo Client setup — defined but NOT yet wired into App.tsx (no ApolloProvider)
    db/                  Empty (.gitkeep only) — no schema, models, or adapter yet
    screens/             Empty (.gitkeep only) — no screens yet
  android/, ios/        Native projects, gitignored (generated via Expo prebuild) — don't hand-edit
```

No `components/`, `graphql/`, or `navigation/` folders exist yet. No
navigation library is installed — this is an open choice for whoever builds
the Jobs feature. There is no Project/Image reference UI on mobile; the
reference slice lives server-side only (`apps/api/core/`).

## WatermelonDB: native side is done, app side is not

Already wired (don't redo):
- `@nozbe/watermelondb` + `@lovesworking/watermelondb-expo-plugin-sdk-52-plus`
  in `package.json`
- Expo plugin registered in `app.json` (`expo.plugins`), alongside
  `expo-build-properties`
- Babel decorators in `babel.config.js`
  (`@babel/plugin-proposal-decorators`, legacy mode) — required for
  WatermelonDB's `@field`/`@relation` decorators
- Native Android wiring confirmed generated:
  `android/app/build.gradle` has `implementation project(':watermelondb-jsi')`
- `metro.config.js` blocklists native build scratch dirs (`.cxx/**`)

Still to build (`src/db/` is empty): `schema.ts`, model classes (e.g.
`Job.ts`, `Post.ts`), `SQLiteAdapter` instantiation, and sync logic calling
`synchronize()` against the API's sync endpoint.

## Apollo Client

`src/apollo.ts`: `ApolloClient` with `HttpLink` + `InMemoryCache`, URI from
`process.env.EXPO_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql/"`.
**Not yet wired into `App.tsx`** — no `ApolloProvider` in the tree yet.

No `.env` files needed normally: `yarn dev` (`scripts/dev.sh`) runs `adb
reverse tcp:8000 tcp:8000` and `adb reverse tcp:9000 tcp:9000` for the
Android emulator; iOS simulator resolves `localhost` natively. Override with
`EXPO_PUBLIC_GRAPHQL_URL` / `EXPO_PUBLIC_API_URL` only when pointing at a
remote API.

## Image capture/picker

Available: `expo-image-picker` (~55.0.21), `expo-image-manipulator`
(~55.0.18). No `expo-camera` installed.

## What needs building

- Navigation (pick a library — none installed)
- WatermelonDB schema/models/adapter/sync (`src/db/`)
- Screens: create Job, add Post with picture (capture or pick from gallery),
  list Jobs/Posts, offline create/read
- Wire `ApolloProvider` into `App.tsx`
- Sync worker: upload local Post pictures (`pictureLocalUri`) to MinIO before
  push, then push only the resulting key (see root CLAUDE.md data flow)

## Running

```bash
yarn dev:mobile      # from repo root — auto-detects iOS/Android
# or, from within apps/mobile:
yarn dev             # scripts/dev.sh — handles ANDROID_HOME/JAVA_HOME, emulator boot, adb reverse, Metro
yarn android         # expo run:android
yarn ios             # expo run:ios
```

Requires the API stack up (`yarn stack:up` from repo root).

## Conventions

No tests exist yet. `lint` script is currently a stub (no real ESLint
config). `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`.
