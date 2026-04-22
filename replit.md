# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifacts/linktree)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### LinkHub (linktree)
- **Type**: react-vite, served at `/`
- **Port**: 5173
- **Pages**:
  - `/` — Public profile page with grid background, avatar, bio, link cards
  - `/admin` — Admin dashboard to manage links, edit profile, view stats

### API Server (api-server)
- **Type**: Express API, served at `/api`
- **Port**: 8080

## Database Schema

### profile table
- id (text, PK, default "default")
- username, displayName, bio, avatarUrl, backgroundTheme
- totalClicks (integer)
- createdAt, updatedAt

### links table
- id (text, PK, UUID)
- title, url, icon
- clickCount, sortOrder, isActive
- createdAt, updatedAt

## API Endpoints

- `GET /api/profile` — Get profile
- `PUT /api/profile` — Update profile
- `GET /api/links` — Get all links
- `POST /api/links` — Create link
- `PUT /api/links/:id` — Update link
- `DELETE /api/links/:id` — Delete link
- `POST /api/links/:id/click` — Record click
- `PUT /api/links/reorder` — Reorder links
- `GET /api/stats` — Get stats

## Environment Variables

- `SUPABASE_URL` — Supabase project URL (set but DB uses Replit's built-in PostgreSQL)
- `SUPABASE_ANON_KEY` — Supabase anon key
- `DATABASE_URL` — Replit built-in PostgreSQL connection string
- `SESSION_SECRET` — Session secret

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
