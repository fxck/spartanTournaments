# Contributing to SpartanTournaments

Thanks for your interest in contributing! This document covers how to set up the
project, the checks your changes need to pass, and how to submit them.

## Development setup

See the [README](./README.md#getting-started) for full setup. In short:

```bash
pnpm install
docker compose up -d        # local PostgreSQL
cp .env.example .env        # then set SESSION_SECRET (≥ 32 chars)
pnpm db:migrate
pnpm dev
```

## Project layout

- `src/app` — Analog/Angular front end (pages, components, shared services).
- `src/server` — Nitro API routes and server-side logic.
- `libs/calc-tournament` — standalone, presentation-free tournament-calculation
  library with full unit-test coverage. Keep it free of Angular/HTTP concerns.

See [CONTEXT.md](./CONTEXT.md) for the domain model and
[DOCUMENTATION.md](./DOCUMENTATION.md) for architecture notes.

## Checks before you push

CI runs the following on every push and pull request. Run them locally first so
your PR goes green:

```bash
pnpm format:check   # Prettier — run `pnpm format` to auto-fix
pnpm lint           # ESLint — run `pnpm lint:fix` to auto-fix
pnpm typecheck      # tsc, no emit
pnpm test           # Vitest
```

New behavior in `libs/calc-tournament` or `src/server` should come with tests.

## Submitting changes

1. Fork the repo and create a feature branch off `main`.
2. Make focused commits with clear messages.
3. Ensure all four checks above pass.
4. Open a pull request describing what changed and why.

## Notes

- The UI is currently in German. New user-facing strings should follow suit until
  i18n is in place.
- Please keep `libs/calc-tournament` presentation-agnostic — no framework imports.
