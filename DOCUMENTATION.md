# spartanTournaments — Projektdokumentation

## Überblick

Eine Turnierverwaltungs-App für Boccia-Turniere (aktuell 4Kids). Verwaltet Competitors, generiert Spielpläne, erfasst Ergebnisse und zeigt Gruppen- und Finalstände an.

Migrationsprojekt von LunaTournaments (Angular 16 + Analog 0.2.x) zu spartanTournaments (Angular 21 + Analog 2.5 + Spartan UI + Tailwind 4).

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | Angular 21 (Zoneless, Signals) |
| Meta-Framework | Analog 2.5 (SSR + File-based Routing) |
| UI-Komponenten | Spartan UI (Helm + Brain) |
| Styling | Tailwind CSS 4 |
| API | Nitro Routes (`server/routes/api/`) |
| Data Fetching | `injectLoad()` + `resource()` |
| Datenbank | PostgreSQL 17 (Docker) + Drizzle ORM |
| Auth | iron-session (verschlüsseltes Cookie) + bcryptjs |
| Package Manager | pnpm |
| Testing | Vitest + Playwright |

---

## Domain-Glossar

### Competitor
Teilnehmer an einem Turnier. Bewusst generisch — kann eine Einzelperson oder ein Team sein. Im aktuellen Boccia-Turnier ist ein Competitor ein 2-Personen-Team. **Nicht** "Team" als Synonym verwenden — im Code immer `Competitor`.

### Pairing
Ein geplantes Spiel zwischen zwei Competitors auf einem bestimmten Court zu einer bestimmten Zeit. Hat eine `gamenumber` (fortlaufende Anzeigenummer) und eine `groupID` die die Turnierphase kodiert.

**GroupID-Konvention:**
- `groupID > 0` → Gruppenphase, gehört zu dieser Gruppe
- `groupID < 0` → Finalphase; kodiert den **Bracket-Slot** (nicht die Runde!)

**Round-Konvention (für Finalphase):**
- `round < 0` → Finalphase; der negative Wert kodiert die Runde:
  - `-1` = Finale
  - `-2` = Halbfinale
  - `-4` = Viertelfinale
  - `-8` = Achtelfinale

> **Wichtig:** Für die Anzeige des Phasennamens immer `round` verwenden, nicht `groupID`. `groupID < 0` prüft nur ob ein Spiel zur Finalphase gehört.

### GamePoint
Das rohe Spielergebnis eines Pairings: `competitor1Points` und `competitor2Points`. Genau ein GamePoint pro Pairing (Upsert). Wird vom Referee eingetragen.

### MatchPoint
Abgeleitet aus einem GamePoint via `calcMatchPoints()`. **Nicht** in der DB gespeichert — immer berechnet. Repräsentiert Sieg/Niederlage/Unentschieden-Punkte für das Ranking.
- Sieg: 2 Punkte
- Unentschieden: 1 Punkt
- Niederlage: 0 Punkte

### TournamentDetails
Konfigurationszeile für das Turnier: Zeitplanung, parallele Courts, Finalistenzahl, Passwort-Hashes. Es gibt **genau eine Zeile** in dieser Tabelle pro Deployment. Queries verwenden `.limit(1)` — kein `WHERE id = 1`.

### Turnierphase
1. **Gruppenphase** — Round-Robin innerhalb von Gruppen. Gruppen werden via Losziehung (`drawNumber`) gebildet. Spielplan generiert durch `CalcMostGamesPerCompetitorPlan`.
2. **Finalphase** — KO-Bracket basierend auf Gruppenranking. Generiert durch `calcFinals()`, runde für runde weitergeführt durch `calcNextFinalRound()`.

---

## Architektur-Entscheidungen

### Single-Tournament
Ein Deployment = ein Turnier. Keine Multi-Turnier-Unterstützung. Wenn mehrere Turniere gebraucht werden → mehrere Deployments mit separaten `DATABASE_URL`.

### Kein globaler AppState
Kein `AppStateService`. Jede Page verwaltet ihre eigenen Daten:
- **`injectLoad()`** — Route-level Server-Daten, läuft während SSR, sofort beim Render verfügbar
- **`resource()`** — Reaktives Client-seitiges Fetching, für Polling (z.B. Home-Page alle 30s) und nach Mutations
- Abgeleitete Views (Gruppen, gefilterte Pairings, Finals) sind lokale `computed()` Signals

### Keine tRPC
API-Schicht via Nitro Routes (`server/routes/api/`). Auth wird direkt pro Route via `requireAdmin()` / `requireReferee()` Helper durchgesetzt.

### Kein `users`-Table
Die einzigen Identitäten im System sind Admin und Referee, beide definiert über Passwörter in `TournamentDetails`.

### Competitor-Filter via Route-Parameter
Kein globaler `setCompetitorId()`. Die Competitor-ID lebt im URL (`/competitor/5`) und fließt direkt in die API-Queries.

---

## Rollen & Authentifizierung

| Rolle | Berechtigungen |
|---|---|
| **Public** | Read-only: aktuelle Spiele, Spielplan, Gruppen, Ergebnisse, Competitor-Ansicht |
| **Referee** | + GamePoints erfassen und bearbeiten |
| **Admin** | + TournamentDetails konfigurieren, Competitors verwalten, Turnier berechnen |

**Auth-Flow:**
1. Client sendet Plaintext-Passwort via HTTPS POST zu `/api/auth/login`
2. Server führt `bcrypt.compare()` gegen gespeicherten Hash durch
3. Bei Erfolg: iron-session Cookie mit `{ role: 'admin' | 'referee' }` gesetzt
4. Folge-Requests: Cookie wird automatisch mitgeschickt, Server liest Rolle
5. Client berechnet **keine** Hashes

**Passwort-Management:**
- Gespeichert als bcrypt-Hashes in `tournamentDetails`
- **Erstes Setup:** Setup-Page die erscheint wenn kein `tournamentDetails`-Eintrag existiert
- **Ändern:** Optionales "Neues Passwort"-Feld im Admin-Formular — leer lassen = unverändert
- **Reset/Vergessen:** `DELETE FROM tournament_detail;` → App zeigt wieder Setup-Page

**Session:** `iron-session` — verschlüsseltes Cookie, kein Server-seitiger Session-Store.

---

## Setup Guard

Wenn kein `tournamentDetails`-Eintrag in der DB existiert:
- Alle Routes redirecten zu `/setup`
- Nach erfolgreichem Setup → Redirect zu `/admin`
- Setup-Page ist nur erreichbar wenn kein Turnier existiert

---

## Seiten & Navigation

Persistente Top-Navigation:

| Route | Sichtbarkeit | Beschreibung |
|---|---|---|
| `/` (Home) | Public | Aktuelle & kommende Spiele, Auto-Refresh alle 30s |
| `/gameplan` | Public | Vollständiger Spielplan (Gruppen + Finals) |
| `/groups` | Public | Gruppenranking mit Matchpoints |
| `/results` | Public / Referee | Ergebnisse; Referees können bearbeiten |
| `/competitor/[id]` | Public | Persönliche Ansicht mit Tabs: Spielplan / Gruppen / Ergebnisse |
| `/login` | Public | Passwort-Login für Admin/Referee |
| `/admin` | Admin only | Turnierkonfiguration + Competitor-Verwaltung |
| `/setup` | Nur ohne Turnier | Initiales Setup |

Admin-Link in der Nav nur sichtbar wenn `role === 'admin'`.

---

## API Routes

Alle Routes unter `server/routes/api/`:

```
api/
├── auth/
│   ├── session.get.ts          → GET  aktuelle Session-Rolle
│   ├── login.post.ts           → POST Passwort-Login
│   └── logout.post.ts          → POST Session löschen
├── tournament/
│   ├── index.get.ts            → GET  TournamentDetails lesen
│   ├── setup.post.ts           → POST Erstes Setup (nur wenn kein Turnier)
│   └── index.put.ts            → PUT  Details aktualisieren (Admin)
├── competitors/
│   ├── index.get.ts            → GET  Alle Competitors
│   ├── index.post.ts           → POST Neuen Competitor anlegen (Admin)
│   ├── [id].delete.ts          → DEL  Competitor löschen (Admin)
│   ├── groups.get.ts           → GET  Gruppen (optional: ?competitorId=X)
│   └── random-draw.post.ts     → POST Losziehung durchführen (Admin)
├── pairings/
│   ├── index.get.ts            → GET  Alle Pairings
│   └── active.get.ts           → GET  Aktuell laufende & kommende Spiele
├── gamepoints/
│   ├── index.get.ts            → GET  Alle GamePoints
│   └── index.post.ts           → POST GamePoint speichern/aktualisieren (Referee)
└── actions/
    ├── calc-tournament.post.ts       → POST Turnier neu berechnen (Admin)
    ├── calc-finals.post.ts           → POST Finals generieren (Admin)
    └── calc-next-final-round.post.ts → POST Nächste Finalrunde berechnen (Admin)
```

---

## Datenbankschema

```typescript
// Kein users-Table

competitors {
  id            serial PK
  name          text NOT NULL
  drawNumber    integer           // Losnummer für Gruppenbildung
  groupID       integer           // Zugewiesene Gruppe (null = noch nicht eingeteilt)
  createdAt     timestamp
}

tournamentDetails {
  id                        serial PK  // immer genau 1 Zeile
  name                      text NOT NULL
  numberOfParallelGames     integer NOT NULL
  minutesPerGame            integer NOT NULL
  minutesAvailForGroupsPhase integer NOT NULL
  finalistCount             integer NOT NULL
  tournamentStartTime       timestamp NOT NULL
  finalsStartTime           timestamp NOT NULL
  adminPasswordHash         text NOT NULL  // bcrypt
  refereePasswordHash       text NOT NULL  // bcrypt
  createdAt                 timestamp
}

pairings {
  id            serial PK
  gamenumber    integer NOT NULL
  competitor1ID integer NOT NULL
  competitor2ID integer NOT NULL
  round         integer NOT NULL
  groupID       integer NOT NULL  // >0 = Gruppe, <0 = Finalrunde
  startTime     timestamp NOT NULL
  court         integer NOT NULL
  createdAt     timestamp
}

gamePoints {
  id                serial PK
  competitor1Points integer NOT NULL
  competitor2Points integer NOT NULL
  pairingID         integer NOT NULL
  createdAt         timestamp
  updatedAt         timestamp  // neu: wann zuletzt geändert
}
```

---

## Bekannte Bugs (aus Migration gefixt)

### 1. Verwaiste GamePoints bei Neuberechnung
**Alt:** `calcTournament` löschte alle Pairings, aber nicht die zugehörigen GamePoints → veraltete Ergebnisse blieben nach einer Neuberechnung erhalten.

**Fix:** GamePoints **vor** Pairings löschen:
```typescript
await db.delete(gamePoints);
await db.delete(pairings);
```

### 2. `forEach` + `async` Anti-Pattern
**Alt:** Alle drei Action-Mutations verwendeten `forEach(async ...)` was die Promises nicht awaited. Die Mutation kehrte zurück bevor die DB-Writes abgeschlossen waren.

**Fix:** `Promise.all(items.map(async ...))`:
```typescript
await Promise.all(plan.pairings.map((p) => db.insert(pairings).values({...})));
```

### 3. Finals-GamePoints nicht bereinigt
**Alt:** `calcFinals` löschte Finals-Pairings (`groupID < 0`) aber nicht deren GamePoints.

**Fix:** Zugehörige GamePoints zuerst löschen:
```typescript
const finalsPairingIds = allPairings.filter((p) => p.groupID < 0).map((p) => p.id);
if (finalsPairingIds.length > 0) {
  await db.delete(gamePoints).where(inArray(gamePoints.pairingID, finalsPairingIds));
}
await db.delete(pairings).where(lt(pairings.groupID, 0));
```

---

## Projektstruktur

```
spartanTournaments/
├── libs/
│   ├── calc-tournament/src/    # Pure TS Berechnungslogik (kein Angular)
│   │   ├── models/models.ts    # CalcCompetitor, CalcPairing, CalcGroup, ...
│   │   └── lib/                # calc-plan, calc-finals, calc-match-points, ...
│   └── ui/                     # Spartan UI Komponenten (via CLI generiert)
├── src/
│   ├── app/
│   │   ├── pages/              # Analog file-based routing
│   │   ├── app.ts
│   │   └── app.config.ts
│   └── server/
│       ├── db/
│       │   ├── schema.ts       # Drizzle Schema
│       │   └── index.ts        # DB-Verbindung
│       ├── session.ts          # iron-session + requireAdmin/requireReferee
│       └── routes/
│           └── api/            # Nitro API Routes
├── drizzle/                    # Generierte Migrations
├── drizzle.config.ts
├── CONTEXT.md                  # Domain-Glossar (Kurzversion)
├── DOCUMENTATION.md            # Diese Datei
└── vite.config.ts
```

---

## Umgebungsvariablen

| Variable | Beschreibung | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection String | — |
| `SESSION_SECRET` | Mindestens 32 Zeichen, für iron-session Cookie-Verschlüsselung | Insecure dev default |
| `NODE_ENV` | `production` aktiviert `secure` Cookie-Flag | — |

---

## Scripts

```bash
pnpm dev          # Dev-Server starten
pnpm build        # Production Build
pnpm preview      # Production Build lokal vorschauen
pnpm test         # Vitest Unit Tests
pnpm db:generate  # Drizzle Migrations generieren
pnpm db:migrate   # Migrations auf DB anwenden
pnpm db:studio    # Drizzle Studio öffnen
```

---

## Best Practices (Mai 2026)

| Bereich | Ansatz |
|---|---|
| API | Nitro Routes (`server/routes/api/`) |
| Data Fetching | `injectLoad()` (SSR) + `resource()` (reaktiv) |
| Reaktivität | Signals, Zoneless Angular |
| Testing | Vitest + Playwright |
| Package Manager | pnpm |
