# spartanTournaments — Agent Instructions & Best Practices

Dieses Dokument dient als zentrale Wissensbasis für KI-Agenten (wie Gemini) und Entwickler, um sicherzustellen, dass neue Features und Fixes den Architektur-Standards des Projekts entsprechen.

## Technologiestandards (Mai 2026)

### Angular 21 (Zoneless & Signals)
- **Zoneless:** Das Projekt läuft ohne `zone.js`. Alle UI-Updates müssen über Signals getriggert werden.
- **Signals:** Verwende `signal`, `computed` und `effect` anstelle von Observables für lokalen State.
- **Data Fetching:** 
    - Nutze `resource()` für asynchrones Laden von Daten im Browser.
    - Falls `resource()` Typprobleme macht (bekannt in frühen Angular 21 Alphas), nutze das `effect` + `HttpClient` Pattern in der Komponente.
- **Standalone:** Alle Komponenten sind `standalone: true`.

### Analog.js (Meta-Framework)
- **SSR & Hydration:** Das Projekt nutzt Server-Side Rendering.
- **Cookie Forwarding:** Da die API unter `/api` läuft, müssen Cookies bei SSR-Requests manuell weitergereicht werden. Ein `cookieInterceptor` in `app.config.ts` stellt dies sicher.
- **Routing:** Nutze File-based Routing in `src/app/pages`. Layouts werden über `(group).page.ts` definiert.
- **Server Load:** Bevorzugte Methode für Data Fetching ist eine `load`-Funktion in einer `.server.ts`-Datei (oder direkt im `.page.ts`), die via `injectLoad<typeof load>()` im Component oder als `@Input() load = input<ReturnType<typeof load>>();` konsumiert wird.
- **Interceptors:** Der `requestContextInterceptor` muss immer der **letzte** Interceptor in der `HttpClient`-Konfiguration sein.
- **API:** Serverseitige Logik liegt in `src/server/routes/api`. Nutze `h3` EventHandler.

### UI & Styling
- **Spartan UI:** Nutze primär **Directives** auf nativen Elementen (z.B. `<table hlmTable>`) anstatt Custom Components, wo immer möglich. Dies entspricht dem Shadcn-Prinzip.
- **Tailwind 4:** Verwende das neue `@theme` System in `styles.css`. Nutze CSS-Variablen (`--color-primary`) für Theme-Konsistenz.

## Bekannte Fallstricke

1. **Hydration Mismatch:** Vermeide direkten Zugriff auf `window` oder `document` außerhalb von `isPlatformBrowser` Checks.
2. **Session Persistence:** Bei Problemen mit dem Logout nach Reload prüfen, ob der `cookieInterceptor` aktiv ist und die Route den `adminGuard` korrekt nutzt.
3. **Drizzle Joins:** Beim Abfragen von Pairings immer mit `competitors` joinen (via `alias`), um Namen direkt in der API-Antwort zu haben.

## Projekt-Struktur
- `libs/calc-tournament`: Reine Berechnungslogik (kein Angular-Bezug).
- `libs/ui`: Spartan UI Komponenten (Helm + Brain).
- `src/app/pages`: UI-Routes.
- `src/server/db`: Drizzle Schema und Client.
