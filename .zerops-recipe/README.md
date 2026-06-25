# SpartanTournaments — Zerops recipe

A self-hosted app for running a single round-based competition from groups to finals.

## Recipe metadata

- **Name:** <!-- #ZEROPS_EXTRACT_START:name# -->SpartanTournaments<!-- #ZEROPS_EXTRACT_END:name# -->
- **Shape:** <!-- #ZEROPS_EXTRACT_START:shape# -->app<!-- #ZEROPS_EXTRACT_END:shape# --> — fork and deploy your own copy
- **Environments:** `AI Agent` · `Production` — an agent-driven dev/stage pair for development, and a single-node small production.

## Tagline

<!-- #ZEROPS_EXTRACT_START:intro# -->
A self-hosted web app for running a single round-based competition from start to
finish — configure the tournament, manage competitors, draw groups, play a
round-robin groups phase, then progress through a knockout finals bracket, with
live public views of schedule, standings and results.
<!-- #ZEROPS_EXTRACT_END:intro# -->

## Overview

<!-- #ZEROPS_EXTRACT_START:description# -->
SpartanTournaments runs one tournament per deployment, from configuration to the
final. An admin sets up the competition and competitors, draws them into groups,
and plays out a round-robin groups phase; the app then seeds a knockout finals
bracket from the group standings and progresses it round by round. Referees enter
scores, while everyone else gets live, read-only public views of the current and
upcoming games, the full schedule, group standings, and per-competitor results.

It is built with Analog (Angular + Nitro) for server-side rendering and API
routes, Spartan UI and Tailwind CSS v4 for the interface, Drizzle ORM over
PostgreSQL for storage, and iron-session with bcrypt for authentication. The
tournament-calculation logic lives in a standalone, presentation-free library
with full unit-test coverage.

Two topologies ship as one recipe: an **AI Agent** dev/stage pair for
agent-driven development (`appdev` as a ready-to-edit working dev environment and
`appstage` as a live reference, both built from git), and a single-node **Production** for
running it for real. Both use a single PostgreSQL database; the session secret is
generated on import and the schema migrates automatically on first boot.
<!-- #ZEROPS_EXTRACT_END:description# -->

## Features

<!-- #ZEROPS_EXTRACT_START:features# -->
- Single tournament per deployment — one running instance hosts one competition
- Groups phase: competitors are drawn into groups and play round-robin pairings
- Finals phase: a knockout bracket seeded from group standings, progressed round by round
- Roles: Admin (configuration, competitors, calculation), Referee (score entry), and public read-only views
- Public live views of current & upcoming games, full schedule, group standings, and per-competitor results
- Presentation-free tournament-calculation library with full unit-test coverage
- Session secret generated on import; database migrations run automatically on first boot
<!-- #ZEROPS_EXTRACT_END:features# -->

## First-run setup

<!-- #ZEROPS_EXTRACT_START:takeover-guide# -->
After the project deploys, open the running app's subdomain — the **app** service
in Production, or **appstage** in the AI Agent topology (its dev half, **appdev**,
starts empty for you / an agent to adopt). Then:

1. Sign in as the administrator and configure the tournament (name, settings) and
   the list of competitors.
2. Draw the groups and play out the round-robin groups phase, entering scores as
   Admin or Referee.
3. Run the calculation to seed the knockout finals bracket from the group
   standings, then progress it round by round.
4. Share the public views (schedule, standings, results) — they are read-only and
   require no login.

The UI is currently in German.
<!-- #ZEROPS_EXTRACT_END:takeover-guide# -->

## Knowledge base

<!-- #ZEROPS_EXTRACT_START:knowledge-base# -->
### Architecture

- **app** (`appdev` / `appstage` in the AI Agent topology) — Analog (Angular +
  Nitro) application serving the server-rendered UI and the Nitro API routes that
  drive every action and public view. Listens on port 3000.
- **db** — PostgreSQL accessed through Drizzle ORM; the schema is applied with
  `drizzle-kit migrate` as an init command before the app starts.
- **calc-tournament** — a standalone, presentation-free library (in `libs/`) that
  holds all tournament-calculation logic (group draws, round-robin scheduling,
  standings, finals seeding) and is fully unit-tested. It is a library, not a service.

Authentication uses iron-session cookies with bcrypt-hashed passwords; requests
are validated with Zod.

### Environments

- **AI Agent** — a dev + stage pair over single-node Postgres, both built from
  git. `appdev` uses the `dev` setup as a working dev environment to mount, edit
  and iterate on; `appstage` uses the `prod` setup as a live reference. Non-HA,
  lightweight.
- **Production** — a single `app` runtime built from git with the `prod` setup,
  autoscaling 1→2 on shared CPU, over single-node Postgres. The cheapest way to
  run it for real; not redundant.

The build/run config for both the `dev` and `prod` setups lives in the root
`zerops.yaml`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string — wired from the `db` service in `zerops.yaml` (`${db_connectionString}/${db_dbName}`); never set by hand |
| `SESSION_SECRET` | yes | ≥ 32-character secret encrypting the iron-session cookie; generated per app service on import |
| `NODE_ENV` | — | `development` on the `dev` setup, `production` on `prod` |

### Troubleshooting

- **App fails to start / database errors on boot** — confirm the `db` service is
  running; the app service runs `drizzle-kit migrate` as an init command and needs
  `DATABASE_URL` to resolve to the `db` service.
- **Logged out unexpectedly after redeploy** — rotating `SESSION_SECRET`
  invalidates existing session cookies; sign in again.
<!-- #ZEROPS_EXTRACT_END:knowledge-base# -->
