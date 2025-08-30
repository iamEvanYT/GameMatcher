# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source. Key areas: `routes/` (HTTP endpoints; auto-mounted), `modules/` (config, DB, matchmaking), `middlewares/` (logging, parsing, errors), `schemas/` (zod), `types/` (shared types). Entry: `src/index.ts`.
- `tests/`: Manual scripts for local testing (`tests/manual/*.ts`).
- `Dockerfile`: Container entrypoint using Bun.

## Build, Test, and Development Commands
- `bun run dev`: Start in watch mode (`bun --watch src/index.ts`).
- `bun run start`: Run the server once (uses Bun).
- `bun run build`: Type-check via `tsc` (no emit).
- Example health check: `curl http://localhost:3000/v1/healthcheck`.
- Manual test scripts: `bun tests/manual/join-queue.ts`, `bun tests/manual/leave-queue.ts`.

## Coding Style & Naming Conventions
- Language: TypeScript (ES modules, target `es2020`).
- Indentation: 2 spaces; keep formatting consistent with existing files.
- Filenames: routes and middlewares use kebab-case (e.g., `join-queue.ts`); types/interfaces PascalCase within code; variables camelCase.
- Validation: zod schemas in `src/schemas`; reuse shared types from `src/types`.

## Testing Guidelines
- Framework: none configured; use manual scripts under `tests/manual/` to exercise endpoints.
- Add new manual tests near related features, named after the route (e.g., `tests/manual/<route>.ts`).
- Targeted checks: verify `/v1/healthcheck`, queue join/leave flows, and expected JSON shapes.

## Commit & Pull Request Guidelines
- Commit style: prefer Conventional Commits (`feat:`, `fix:`, `chore:`) as used in history.
- PRs: include clear description, linked issues, and sample requests/responses (curl or script output). Note any config or migration steps.
- Keep changes small and focused; update README/this guide when structure or commands change.

## Security & Configuration Tips
- Copy `.env.example` to `.env`. Key vars: `AuthKey` (API auth), `MongoUrl` (default `mongodb://localhost:27017`), `Port` (default `3000`), `Environment`, `Instances`, `MATCHMAKING_ENABLED`.
- Start MongoDB locally and ensure indexes are created at startup.
- Use the `AuthKey` in requests where required.

## Architecture Overview
- Server: Hono app with route auto-loading from `src/routes/**`.
- Data: MongoDB; collections configured in `modules/config.ts`.
- Matchmaking: logic under `modules/matchmaking/**`; enable via `MATCHMAKING_ENABLED=true`.
