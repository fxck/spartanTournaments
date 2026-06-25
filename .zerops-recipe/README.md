<!-- #ZEROPS_EXTRACT_START:name# -->
SpartanTournaments
<!-- #ZEROPS_EXTRACT_END:name# -->

<!-- #ZEROPS_EXTRACT_START:shape# -->
ssr
<!-- #ZEROPS_EXTRACT_END:shape# -->

<!-- #ZEROPS_EXTRACT_START:intro# -->
A self-hosted web app for running a single round-based competition from start to
finish — configure the tournament, manage competitors, draw groups, play a
round-robin groups phase, then progress through a knockout finals bracket, with
live public views of schedule, standings and results.
<!-- #ZEROPS_EXTRACT_END:intro# -->

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

This recipe deploys the SSR application and a PostgreSQL database. The session
secret is generated on import and the database schema is migrated automatically
on first boot, so the app is ready to use as soon as it starts.
<!-- #ZEROPS_EXTRACT_END:description# -->

<!-- #ZEROPS_EXTRACT_START:features# -->
- Single tournament per deployment — one running instance hosts one competition
- Groups phase: competitors are drawn into groups and play round-robin pairings
- Finals phase: a knockout bracket seeded from group standings, progressed round by round
- Roles: Admin (configuration, competitors, calculation), Referee (score entry), and public read-only views
- Public live views of current & upcoming games, full schedule, group standings, and per-competitor results
- Presentation-free tournament-calculation library with full unit-test coverage
- Session secret generated on import; database migrations run automatically on first boot
<!-- #ZEROPS_EXTRACT_END:features# -->

<!-- #ZEROPS_EXTRACT_START:takeover-guide# -->
After the project deploys:

1. Open the **ssr** service's subdomain URL.
2. Sign in as the administrator and configure the tournament (name, settings) and
   the list of competitors.
3. Draw the groups and play out the round-robin groups phase, entering scores as
   Admin or Referee.
4. Run the calculation to seed the knockout finals bracket from the group
   standings, then progress it round by round.
5. Share the public views (schedule, standings, results) — they are read-only and
   require no login.

The UI is currently in German.
<!-- #ZEROPS_EXTRACT_END:takeover-guide# -->

<!-- #ZEROPS_EXTRACT_START:knowledge-base# -->
### Architecture

- **ssr** — Analog (Angular + Nitro) application serving the server-rendered UI
  and the Nitro API routes that drive every action and public view.
- **db** — PostgreSQL accessed through Drizzle ORM; the schema is applied with
  `drizzle-kit migrate` as an init command before the app starts.
- **calc-tournament** — a standalone, presentation-free library that contains all
  tournament-calculation logic (group draws, round-robin scheduling, standings,
  finals seeding) and is fully unit-tested.

Authentication uses iron-session cookies with bcrypt-hashed passwords; requests
are validated with Zod.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (wired from the `db` service) |
| `SESSION_SECRET` | yes | ≥ 32-character secret encrypting the iron-session cookie (generated on import) |
| `NODE_ENV` | — | set to `production` for deployments |

### Troubleshooting

- **App fails to start / database errors on boot** — confirm the `db` service is
  running; the `ssr` service runs `drizzle-kit migrate` as an init command and
  needs `DATABASE_URL` to resolve to the `db` service.
- **Logged out unexpectedly after redeploy** — rotating `SESSION_SECRET`
  invalidates existing session cookies; sign in again.
<!-- #ZEROPS_EXTRACT_END:knowledge-base# -->
