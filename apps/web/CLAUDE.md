# apps/web — Next.js client

See also: [root CLAUDE.md](../../CLAUDE.md) for the cross-app data flow and
overall status. This file covers the web layer specifically.

## Stack

Next.js 14.2.13 (App Router), React 18.3.1, Apollo Client 3.11.8, Tailwind
CSS v4 (`@tailwindcss/postcss`), TypeScript (strict, `moduleResolution:
bundler`, `@/*` → `./src/*`). No GraphQL codegen, no test runner configured.

## Structure (as it exists today — bare scaffold)

```
apps/web/
  .env.local            NEXT_PUBLIC_GRAPHQL_URL (untracked, gitignored)
  .eslintrc.json         extends "next/core-web-vitals"
  src/
    global.d.ts           declare module "*.css"
    app/
      layout.tsx           RootLayout, wraps children in <Providers>
      page.tsx              "use client" placeholder home page
      providers.tsx         Apollo client/provider setup
      globals.css            single line: @import "tailwindcss"
      theme.css               Tailwind v4 @theme design tokens (colors, spacing, radii, font sizes) —
                               currently untracked and NOT imported anywhere (not referenced from
                               globals.css or layout.tsx). Wire it up before relying on the tokens.
```

No `components/`, `lib/`, or `graphql/` folders exist yet — create them as
the Jobs/Posts UI is built. There is no Project/Image reference UI on the web
side; that reference slice is server-only (`apps/api/core/`) and read-only —
there's no existing client-side pattern to copy here, only the API pattern to
build against.

## Apollo Client

`src/app/providers.tsx`: `ApolloClient` with `HttpLink` (`uri:
NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql/"`) and
`InMemoryCache`, memoized via `useMemo`, wrapped as `ApolloProvider`. Used
once in `src/app/layout.tsx`. No split links, no error link, no auth — bare
minimum client. Follow this pattern; don't introduce a second Apollo instance.

## What needs building

- `components/`, `lib/`, `graphql/` (or similar) for the Jobs feature
- List Jobs + their Posts, create Job, add Post (with picture) via the
  presigned-MinIO-upload flow described in the root CLAUDE.md
- Wire `theme.css` into the app if using its design tokens

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

## Conventions

No tests exist yet. ESLint via `next/core-web-vitals`; no Prettier config
file despite `prettier` being a root devDependency (unconfigured). No
codegen — GraphQL operations are hand-typed today; if you add
graphql-codegen, note it here.
