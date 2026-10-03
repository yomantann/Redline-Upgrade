# Redline Upgrade

A local tabletop-style strategy game, with a server-side identity and room foundation for future multiplayer.

## Run & Operate

- The managed `artifacts/api-server: API Server` workflow runs the API with its Replit-provided port and routing.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Replit provides `DATABASE_URL` for PostgreSQL and `REPL_ID` for OIDC. The auth issuer defaults to `https://replit.com/oidc`; no OIDC client secret is stored in the app.
- Production schema changes are applied through Replit Publish after the development schema is updated; do not run schema DDL from app startup or production builds.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — source of truth for authentication, sessions, rooms, and room players
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `artifacts/api-server/src/routes/` — authenticated server routes
- `lib/replit-auth-web/` — browser sign-in state and redirect helpers
- `artifacts/redline-upgrade/src/game/` — local single-player game state and mechanics

## Architecture decisions

- Replit OIDC subject IDs are the persistent user identity; characters, careers, matches, and player slots remain separate game concepts.
- Room reads require membership; changing room settings is host-only and limited to waiting rooms.
- Single-player remains usable without signing in. This phase adds no lobby UI or persistent gameplay state.

## Product

Redline Upgrade provides a local single-player tabletop game. Replit Auth and persistent room records establish a secure base for a later multiplayer lobby.

## User preferences

- Do not convert local single-player play to multiplayer or change game mechanics as part of authentication and room-foundation work.
- Do not build the multiplayer lobby before the next phase.

## Gotchas

- Regenerate API client and Zod files after editing `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/db run push` targets development only; Replit Publish applies the development schema to production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
