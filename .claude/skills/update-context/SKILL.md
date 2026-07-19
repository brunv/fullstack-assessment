---
name: update-context
description: Keep this monorepo's CLAUDE.md context files (root CLAUDE.md, apps/api/CLAUDE.md, apps/web/CLAUDE.md, apps/mobile/CLAUDE.md) in sync with the code. Use proactively right after landing a meaningful change in apps/api, apps/web, or apps/mobile — new models, GraphQL types/mutations, screens/components, DB schema, sync logic, dependencies, or scripts. Also use on demand when asked to "update the context files", "sync CLAUDE.md", or "update agent context".
---

# Update context

This repo's CLAUDE.md files describe two things per app: its **structure**
(files/folders that exist) and its **current status** (what's built vs. what
still needs building — see each file's status section). Both go stale as soon
as code changes. This skill re-syncs them without turning them into a diff
log.

## When to run this

- Right after finishing a change that alters structure or status: a new
  model, GraphQL type/mutation, screen/component, DB schema/migration, sync
  endpoint, navigation setup, new dependency, or new script.
- Skip it for pure bug fixes, refactors that don't change file layout, or
  changes to files the CLAUDE.md files don't describe (e.g. editing an
  existing component's internals).

## Steps

1. **Scope the change.** Run `git status` / `git diff` (or review what was
   just changed in the conversation) to see which app(s) were touched:
   `apps/api`, `apps/web`, `apps/mobile`, or root-level config.

2. **For each touched app, open its CLAUDE.md and check for drift:**
   - Structure section: does it still list the actual files/folders? Add new
     ones, remove ones that no longer exist, don't leave stale paths.
   - "What needs building" / status callouts: if something listed as missing
     just got built, move it out of "missing" and describe where it lives
     now (file path + one line, not the whole implementation).
   - New conventions worth a future agent knowing (a testing setup that
     didn't exist before, a lint config that got added, a new pattern to
     follow) — add a short note, don't restate the diff.

3. **Update the root CLAUDE.md only if the change is cross-cutting** — e.g. a
   full layer of the Job/Post feature landed (say, `createJob`/`createPost`
   mutations now exist server-side), which changes the "Current status:
   scaffold only" section's accuracy. Don't touch the root file for
   single-app-internal changes.

4. **Keep it terse.** These files are pointers an agent reads before touching
   code, not changelogs. One line per fact, exact file paths, no prose about
   *why* the change was made (that belongs in the commit message). Git
   history is the source of truth for what changed and when; CLAUDE.md is
   only for what's true right now.

5. **Don't invent structure that doesn't exist yet.** If a section says
   "nothing here yet" and that's still accurate, leave it — don't pad it out
   preemptively.
