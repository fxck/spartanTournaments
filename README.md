# SpartanTournaments

[![Built with Spartan UI](https://img.shields.io/badge/Built%20with-Spartan%20UI-000?logo=angular)](https://spartan.ng)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A self-hosted web app for running a single round-based competition from start to
finish: configure the tournament, manage competitors, draw groups, play a
round-robin groups phase, then progress through a knockout finals bracket — with
live public views of schedule, standings and results.

Built with [Analog](https://analogjs.org) (Angular + Nitro), Drizzle ORM and
PostgreSQL. The tournament-calculation logic lives in a standalone,
presentation-free library (`libs/calc-tournament`) with full unit-test coverage.

> **Origin.** This is an AI-assisted port of an older tournament app, rebuilt on a
> modern stack as a showcase for [Spartan UI](https://spartan.ng), [Angular](https://angular.dev) /
> [Analog](https://analogjs.org), and one-command deployment on [Zerops](https://zerops.io).

## Features

- **Single-tournament, single-deployment** — one running instance hosts one tournament.
- **Groups phase** — competitors are drawn into groups and play round-robin pairings.
- **Finals phase** — a knockout bracket seeded from group standings, progressed round by round.
- **Roles** — Admin (configuration, competitors, calculation), Referee (score entry), and public read-only views.
- **Public views** — current & upcoming games, full schedule, group standings, per-competitor view.

The UI is currently in German. See [CONTEXT.md](./CONTEXT.md) for the full domain
model and [DOCUMENTATION.md](./DOCUMENTATION.md) for deeper architecture notes.

## Tech stack

- [Analog](https://analogjs.org) — Angular meta-framework (SSR + Nitro API routes)
- Angular 21 + [Spartan UI](https://spartan.ng) + Tailwind CSS v4
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- [iron-session](https://github.com/vvo/iron-session) for cookie sessions, bcrypt for password hashing
- Zod for request validation, Vitest for tests

## Getting started

### Prerequisites

- Node.js `>= 22.22.3`
- [pnpm](https://pnpm.io) `10.x`
- Docker (for the local PostgreSQL instance) or your own PostgreSQL server

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a Postgres instance matching the credentials in `.env.example`.
(The compose credentials are for **local development only** — don't reuse them in production.)

### 3. Configure environment

```bash
cp .env.example .env
```

Then set a `SESSION_SECRET` of at least 32 characters. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm dev
```

Navigate to `http://localhost:5173/`. On first run there is no tournament yet, so
you'll be redirected to `/setup` to create one and set the Admin and Referee passwords.

## Environment variables

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | yes      | PostgreSQL connection string.                                      |
| `SESSION_SECRET` | yes      | Secret for encrypting the session cookie. Must be ≥ 32 characters. |
| `NODE_ENV`       | no       | Set to `production` to send session cookies over HTTPS only.       |

## Scripts

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Start the dev server.                     |
| `pnpm build`       | Build client + server for production.     |
| `pnpm preview`     | Run the production build locally.         |
| `pnpm test`        | Run unit tests with Vitest.               |
| `pnpm lint`        | Lint with ESLint.                         |
| `pnpm typecheck`   | Type-check without emitting.              |
| `pnpm format`      | Format with Prettier.                     |
| `pnpm db:generate` | Generate a Drizzle migration from schema. |
| `pnpm db:migrate`  | Apply migrations.                         |
| `pnpm db:studio`   | Open Drizzle Studio.                      |

## Production build

```bash
pnpm build
pnpm preview   # serves dist/analog/server/index.mjs
```

Provide `DATABASE_URL`, `SESSION_SECRET` and `NODE_ENV=production` in the runtime
environment.

### Deploy on Zerops

This repo ships a [Zerops](https://zerops.io) recipe for one-click deployment:

[![Deploy on Zerops](https://raw.githubusercontent.com/zeropsio/recipe-shared-assets/main/deploy-button/green/deploy-button.svg)](https://app.zerops.io/recipes/detail?github=https:%2F%2Fgithub.com%2Felite-benni%2FspartanTournaments)

- [`.zerops-recipe/`](./.zerops-recipe) holds the recipe: a top-level
  `README.md` (the description shown on the recipe page) and one deployment
  profile, **Application**, with its own `README.md` and `import.yaml`.
- `import.yaml` provisions the project — the SSR app plus a PostgreSQL `db`
  service — and generates a `SESSION_SECRET` on import.
- `zerops.yml` defines the build/run pipeline and wires `DATABASE_URL` from the
  `db` service.

Click the button above (or open the
[recipe link](https://app.zerops.io/recipes/detail?github=https:%2F%2Fgithub.com%2Felite-benni%2FspartanTournaments))
to import the project straight from this repository. Zerops builds the `ssr`
service and starts PostgreSQL automatically, running the database migrations on
first boot.

Alternatively, with the [Zerops CLI](https://docs.zerops.io/references/cli):

```bash
zerops project import ".zerops-recipe/1 — Application/import.yaml"
```

## License

[MIT](./LICENSE)
