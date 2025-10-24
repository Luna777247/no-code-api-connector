### Copilot / AI agent instructions — no-code-api-connector

This file gives focused, actionable knowledge for AI assistants working in this repository. Keep responses short and prefer making minimal, reversible changes.

1) Big picture
- The repo contains two primary frontend options and a set of backend utilities:
  - `fullstack-next.js/` — primary Next.js 15 app with App Router (React 19). This is the canonical JS app and contains `app/` route handlers, `lib/` server utilities, `scripts/` test helpers and `package.json` scripts.
  - `frontend_php/` + `backend_php/` — alternative split where the frontend is a Next.js app (port 3001) and `backend_php/` contains a PHP backend (Laravel-like structure under `app/`).

2) Key scripts & developer workflow (run in the relevant subfolder):
- `cd fullstack-next.js` then:
  - `npm install --legacy-peer-deps` — preferred to avoid peer conflicts seen in this repo.
  - `npm run dev` — start Next.js dev server (default port 3000)
  - `npm run build` / `npm run start` — production build & start
  - `npm run lint` — runs `next lint`
  - `npm run test:unit` / `npm run test:api` / `npm run test:integration` — test runners wrap `scripts/run-tests.js` for different scopes
- PHP backend: run `composer install` inside `backend_php` and `php -S localhost:8000` for local dev (see README notes).

3) Project conventions and structure to reference in edits
- `fullstack-next.js/app/` — Next.js Route Handlers and pages. Use this for HTTP API routes.
- `fullstack-next.js/lib/` — server-side utilities (api-executor, workflow-orchestrator, mongo, redis cache, etc.). Changes here affect ETL/core behavior.
- `fullstack-next.js/scripts/` — tooling for tests, backups, storage operations. Use when adding dev tooling or test helpers.
- `backend_php/app/` — PHP controllers/services; avoid cross-editing between JS and PHP implementations unless implementing feature parity.
- Tests: `fullstack-next.js/test/` contains unit/integration/e2e tests; tests rely on `mongodb-memory-server` in CI-like flows.

4) Integration points and external dependencies
- MongoDB (Atlas recommended) — connection strings placed into `.env.local` as `MONGODB_URI`.
- Redis (optional) — used by `redis-cache` utilities.
- Airflow metadata (optional) — configured under `package.json` `airflow` field for orchestration alignment.
- Several third-party UI libs (Radix, shadcn, vaul) are linked; watch for React version mismatches (repo uses React ^19 in `fullstack-next.js`).

5) Editing & PR guidance for AI changes
- Keep changes small and focused. When editing server utilities in `lib/`, run unit tests (`npm run test:unit`) afterwards.
- Avoid large binary or backup files in commits. The repo contains large backup JSON under `fullstack-next.js/backups/` — prefer adding `.gitignore` entries or moving backups out of the repo if suggesting repo-size improvements.
- If merging branches with unrelated histories, maintain human oversight: merges have been done with `--allow-unrelated-histories` previously and conflicts were resolved by preferring incoming branch for some files. Don't auto-resolve large diffs without human review.

6) Examples & patterns (copyable snippets)
- Connect to Mongo in server code (example file: `lib/mongo.ts`): import the exported client and use `await connect()` before DB calls.
- Add route handler: place a file under `app/api/<name>/route.ts` exporting GET/POST handlers and rely on `lib/api-executor.ts` for request orchestration.

7) Where to run quick checks locally (minimal set)
- In `fullstack-next.js`:
  - `npm install --legacy-peer-deps` (one-time)
  - `npm run lint` (fast)
  - `npm run test:unit` (quick unit tests)

8) If unsure, prefer these files as authoritative sources:
- `fullstack-next.js/package.json` (scripts, dependencies)
- `fullstack-next.js/lib/*` (core behavior)
- `fullstack-next.js/app/**` (API surface)
- `backend_php/app/**` (PHP controllers/services)

If any section is unclear or you want more examples (routing, DB usage, test harness), tell me which area to expand and I'll update this file.
