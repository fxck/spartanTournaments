# How the Tournament is Calculated

This document explains how a tournament is computed end-to-end: how teams are
drawn into groups, how the group schedule (Spielplan) is generated and packed
onto courts and time slots, how standings are ranked, and how the knockout
(finals) bracket is built and advanced.

All the pure calculation logic lives in the **`calc-tournament`** library
(`libs/calc-tournament/src/lib/`). It is deterministic and side-effect free —
given the same inputs it always produces the same schedule. The server
(`src/server/tournament-engine.ts`) orchestrates these functions and persists
their output to PostgreSQL (via Drizzle ORM).

## Core data model

See `libs/calc-tournament/src/models/models.ts`.

- **`CalcCompetitor`** — a team. Key fields: `id`, `drawNumber` (Losnummer / seed),
  `groupID`, and the computed standings fields `matchPoints`, `gamePoints`,
  `diff`, `groupRanking`, `finalPosition`, `pairingHistory`.
- **`CalcPairing`** — a single match in the schedule. Key fields: `competitor1ID`,
  `competitor2ID`, `round`, `groupID`, `startTime`, `court` (Bahn), `gamenumber`.
- **`CalcGamePoint`** — a recorded result: `competitor1Points`, `competitor2Points`
  for a given `pairingID`.

### Phase encoding (important convention)

A pairing's phase is encoded across two fields — see `phase.ts`:

- **`groupID > 0`** → group-phase match; the value is the group number.
- **`groupID < 0`** → finals match; `|groupID|` is the bracket-slot index.
- For finals, **`round`** carries the stage: `-1` Final, `-2` Semifinal,
  `-4` Quarterfinal, `-8` Octofinal.
- For group matches, `round` is the 1-based round-robin round number.

Use the helpers `isGroups()`, `isFinals()`, `describePhase()` rather than reading
the signs directly.

## 1. The draw (Losnummer)

`TournamentEngine.assignRandomDraw()` assigns every competitor a unique random
`drawNumber` in the range `1 .. (teamCount * 100)`. The draw number is the seed
used to fill groups and to order the first round of play.

## 2. Filling groups

`calcGroups(competitors, groupCount)` (`calc-groups.ts`):

1. Sorts competitors by `drawNumber` ascending.
2. Fills groups in **ascending draw-number blocks**: the larger groups (filled
   first) get the lowest draws, the smaller, last groups get the highest draws.
   Group sizes stay within ±1 of each other (`base = floor(N/G)`, the first
   `N mod G` groups get one extra).

Example: 45 teams into 7 groups → group sizes `[7, 7, 7, 6, 6, 6, 6]`, with the
lowest draws in group 1 and the highest draws in group 7.

**Why blocks instead of an even spread (feature #4):** draw numbers are *random
lots* (`assignRandomDraw`), not skill seeds, so how they are spread across groups
has no competitive meaning. By putting the highest-lot teams in the smallest
groups, those teams get **fewer games** (a 6-team group plays 5 games vs a 7-team
group's 6), so the organiser can start them later and they still finish on time.
This complements the first-round scheduling order in the packer (also #4).

`calcGroups` throws if `groupCount > teamCount / 2` (a group would have fewer
than 2 teams).

## 3. Generating group pairings (round-robin)

`getPairingsForGroup(group)` (`calc-plan.ts`) generates a full round-robin for a
group using the **Berger / circle rotation method**:

- Every team plays every other team once.
- An odd group gets a virtual "bye" competitor (`id: -1`) which is filtered out,
  so one team sits out each round.
- A group of `n` teams produces `n*(n-1)/2` games over `n-1` rounds (even `n`) or
  `n` rounds (odd `n`, with byes).

So a 7-team group → 21 games over 7 rounds (3 real games per round); a 6-team
group → 15 games over 5 rounds (3 games per round).

## 4. Scheduling: packing matches onto courts and time slots

`CalcPlan(allCompetitors, groups, details)` (`calc-plan.ts`) takes every group's
round-robin pairings and assigns each one a **time slot** (`startTime`) and a
**court** (`court`, 1 .. `numberOfParallelGames`). A "slot" is one wave of games
that all start at the same time across the available courts (lanes).

Time for slot `k` = `tournamentStartTime + k * minutesPerGame`.

### The packer

The scheduler is a **greedy backfill packer**. For each time slot it repeatedly
picks the best eligible pairing from the entire remaining pool until all courts
are full or nothing else fits:

A pairing is **eligible** for the current slot when:

1. Neither of its competitors is already playing in this slot (no team plays
   twice at the same time), **and**
2. It does not split a group's **last round** across two slots. A group's final
   round is kept together in one slot for fairness. This rule is only enforced
   when the round can actually fit in a slot (`lastRoundCount <= lanes`),
   otherwise a split is unavoidable and the rule is relaxed (this also prevents
   the scheduler from deadlocking).

Among eligible pairings the packer chooses by priority:

- **First slot** — order by `round`, then by *draw key* (the highest draw number
  in the pairing). This pushes games containing high-draw teams into the later
  part of round 1 (feature #4, see below).
- **All later slots** — prefer the group with the **most remaining games**, then
  lower round, then draw key. Scheduling the biggest groups first prevents a
  large group from piling up into a lonely, half-empty final slot.

### Why it is built this way (features #1 and #4)

The previous packer iterated a fixed, pre-sorted list and closed a slot the
moment the next list entry didn't fit — it never backfilled idle courts from
later in the list. With uneven group sizes this left the last one or two slots
nearly empty (e.g. for the real 45-team / 7-group / 16-court tournament: 9 slots,
with the final slot holding only the 3 last-round games of a single 7-team group
on 16 courts).

The backfill packer fixes two things:

- **#1 — lane utilisation.** Every slot except the last is filled completely, and
  large groups are spread evenly instead of trailing at the end. The same
  tournament now packs into the theoretical minimum of **8 slots** (123 games /
  16 courts), with the final slot holding 11 games spread across all groups. The
  event finishes about one round (~20 min) earlier.
- **#4 — first round follows the draw (soft).** Within the first slot, games are
  ordered so the highest-draw teams play later. This is a *soft* preference:
  packing efficiency always wins, and it only affects the first round (it just
  determines which round-1 games spill into the second slot). It lets the
  organiser start high-draw-number teams a little later.

`CalcMostGamesPerCompetitorPlan(competitors, details)` is a convenience wrapper
that searches for the group count that maximises games per team while still
fitting the schedule into `minutesAvailForGroupsPhase`. This is what the server
calls to build the group phase.

Tests for the scheduler live in `calc-plan.spec.ts` and
`calc-plan.packing.spec.ts` (correctness invariants, the 8-slot minimum, no idle
tail, and the first-round draw ordering).

## 5. Standings and ranking

After results are entered, `calcAllMatchPoints(competitors, gamePoints, pairings)`
(`calc-all-match-points.ts`) computes each team's totals:

- **Match points** (`calc-match-points.ts`): win = 2, draw = 1, loss = 0.
- **Game points**: sum of points scored.
- **Diff**: points scored − points conceded.
- **`pairingHistory`**: per-opponent record, used for head-to-head tiebreaks.

Within each group, `sortGroupWithH2H()` (`sort-group-h2h.ts`) ranks teams:

1. Match points (highest first).
2. **Two-way tie** on match points → direct head-to-head result has absolute
   priority; if their head-to-head was a draw, fall back to diff then game points.
3. **Three-or-more-way tie** → sort by diff then game points first; if exactly
   two of them remain completely tied on both, break that pair by head-to-head.

Each team gets a `groupRanking` (1 = group winner). Finally
`sortCompetitorsRanking` (`sort-competitors-ranking.ts`) produces a global order:
first by group ranking (all group winners, then all runners-up, …), then by match
points, game points, diff, and head-to-head as further tiebreakers.

## 6. Building the finals bracket

`calcFinals(groups, pairings, gamePoints, finalistCount, …)` (`calc-finals.ts`):

1. Recomputes standings, then takes the top `finalistCount` teams in global rank
   order.
2. Assigns each a **bracket position** via `calcFinalistPositions(finalistCount)`
   (`calc-finals-ranking-positions.ts`), which produces the standard seeding
   order (1 vs lowest, etc., recursively) so that top seeds only meet late.
3. Pairs them up `(0,1), (2,3), …` into the first finals stage, encoding the
   stage in `round` (`-finalistCount/2`) and the bracket slot in `groupID`
   (negative). Courts and start times are assigned sequentially from
   `finalsStartTime`.

`finalistCount` must be a power of two (4 → semis, 8 → quarters, 16 → octofinals,
32 → round of 32, …).

> **Known limitation (feature #3, in progress):** seeding is purely by global
> rank, so the first finals round can pair two teams that came from the *same
> group*. Avoiding same-group opponents in the first finals round is a planned
> change.

## 7. Advancing the bracket

`calcNextFinalRound(finalsPairings, results, minutesPerGame)`
(`calc-next-final-round.ts`) is **idempotent**: it recomputes the whole bracket
from the current set of results, so it can be re-run after every change and
converges from any state.

- It processes feeder matches earliest-stage-first (`-8 → -4 → -2 → -1`).
- The winner of each feeder (higher score) is written into the next-stage slot;
  the two feeders of a slot fill `competitor1` / `competitor2` by an odd/even
  `groupID` rule.
- Next-stage slots are **materialised lazily** — only created once their feeder
  has a result.
- If a feeder's result is later removed, the downstream slots are cleared and the
  change cascades through the rest of the bracket.

The server wires this up in `TournamentEngine`:

- `recordResult()` / `deleteResult()` store or remove a `GamePoint` and, if the
  pairing is a finals match, call `advanceFinalsRound()` in the same transaction.
- `deleteAllResults()` clears every result and recomputes the bracket.

## End-to-end flow (server orchestration)

`src/server/tournament-engine.ts`:

1. `assignRandomDraw()` — give every team a draw number.
2. `generateGroupsPhase()` — `CalcMostGamesPerCompetitorPlan` → groups + schedule,
   persisted to the `pairing` table; competitors get their `groupID`.
3. Results are recorded per match (`recordResult`).
4. `generateFinalsPhase()` — `calcFinals` builds the first finals stage from the
   final group standings.
5. `advanceFinalsRound()` — runs automatically after each finals result to fill
   the next stage, all the way to the final.

## Where to look

| Concern | File |
| --- | --- |
| Group filling (draw → groups) | `libs/calc-tournament/src/lib/calc-groups.ts` |
| Round-robin pairings + scheduling/packing | `libs/calc-tournament/src/lib/calc-plan.ts` |
| Phase encoding helpers | `libs/calc-tournament/src/lib/phase.ts` |
| Match points (win/draw/loss) | `libs/calc-tournament/src/lib/calc-match-points.ts` |
| Standings aggregation | `libs/calc-tournament/src/lib/calc-all-match-points.ts` |
| Group ranking + tiebreaks | `libs/calc-tournament/src/lib/sort-group-h2h.ts` |
| Global ranking | `libs/calc-tournament/src/lib/sort-competitors-ranking.ts` |
| Finals seeding positions | `libs/calc-tournament/src/lib/calc-finals-ranking-positions.ts` |
| Initial finals bracket | `libs/calc-tournament/src/lib/calc-finals.ts` |
| Bracket advancement | `libs/calc-tournament/src/lib/calc-next-final-round.ts` |
| Server orchestration + persistence | `src/server/tournament-engine.ts` |
