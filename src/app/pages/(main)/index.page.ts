import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { injectLoad } from '@analogjs/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './index.server';
import { getPhaseName } from '../../shared/phase-name';
import { injectLivePairings } from '../../shared/live-pairings';

type LoadData = Awaited<ReturnType<typeof load>>;
type ActivePairing = LoadData['active'][number];
type GamePoint = LoadData['gamepoints'][number];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Aktuelle Spiele</h1>
        <p class="text-muted-foreground mt-2">Die nächsten Begegnungen auf den Courts.</p>
      </header>

      <!-- Laufende Spiele -->
      <section class="space-y-4">
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <h2 class="text-2xl font-bold tracking-tight">Laufende Spiele</h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (pairing of runningPairings(); track pairing.id) {
            <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ pairing, live: true }" />
          } @empty {
            <div class="col-span-full py-10 text-center border-2 border-dashed rounded-xl">
              <p class="text-muted-foreground">Aktuell läuft kein Spiel.</p>
            </div>
          }
        </div>
      </section>

      <!-- Demnächst -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold tracking-tight text-muted-foreground">Demnächst</h2>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (pairing of upcomingPairings(); track pairing.id) {
            <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ pairing, live: false }" />
          } @empty {
            <div class="col-span-full py-10 text-center border-2 border-dashed rounded-xl">
              <p class="text-muted-foreground">Keine anstehenden Spiele.</p>
            </div>
          }
        </div>
      </section>
    </div>

    <ng-template #card let-pairing="pairing" let-live="live">
      <div class="border rounded-xl shadow-sm overflow-hidden bg-card">
        <!-- Header band: court + group, time -->
        <div class="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
          <span class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-bold text-primary leading-none truncate">Court {{ pairing.court }}</span>
            <span class="px-2 py-0.5 rounded font-bold text-xs shrink-0 bg-secondary text-secondary-foreground">
              {{ pairing.groupID > 0 ? 'Gruppe ' + pairing.groupID : getPhaseName(pairing.round) }}
            </span>
          </span>
          <span class="flex items-center gap-1.5 shrink-0 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm font-bold tabular-nums leading-none">{{ pairing.startTime | date: 'HH:mm' }}</span>
          </span>
        </div>

        <!-- Matchup (with result, if one has been entered) -->
        @let points = pointsFor(pairing.id);
        <div class="relative px-4 py-4 space-y-1">
          @if (points) {
            <div class="flex items-baseline justify-between gap-3">
              <span
                class="min-w-0 break-words font-semibold"
                [class.font-bold]="points.competitor1Points > points.competitor2Points"
                [class.text-muted-foreground]="!pairing.competitor1?.id"
                [class.italic]="!pairing.competitor1?.id"
                >{{ pairing.competitor1?.name ?? 'Offen' }}</span
              >
              <span class="font-black text-xl tabular-nums shrink-0">{{ points.competitor1Points }}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <span
                class="min-w-0 break-words font-semibold"
                [class.font-bold]="points.competitor2Points > points.competitor1Points"
                [class.text-muted-foreground]="!pairing.competitor2?.id"
                [class.italic]="!pairing.competitor2?.id"
                >{{ pairing.competitor2?.name ?? 'Offen' }}</span
              >
              <span class="font-black text-xl tabular-nums shrink-0">{{ points.competitor2Points }}</span>
            </div>
          } @else {
            <div class="text-center space-y-1">
              <div
                class="font-semibold break-words"
                [class.text-muted-foreground]="!pairing.competitor1?.id"
                [class.italic]="!pairing.competitor1?.id"
              >
                {{ pairing.competitor1?.name ?? 'Offen' }}
              </div>
              <div class="text-muted-foreground/50 text-xs font-black italic">VS</div>
              <div
                class="font-semibold break-words"
                [class.text-muted-foreground]="!pairing.competitor2?.id"
                [class.italic]="!pairing.competitor2?.id"
              >
                {{ pairing.competitor2?.name ?? 'Offen' }}
              </div>
            </div>
          }
          <span class="absolute bottom-1.5 right-2 font-mono text-[10px] text-muted-foreground/40"
            >#{{ pairing.gamenumber > 0 ? pairing.gamenumber : '-' }}</span
          >
        </div>
      </div>
    </ng-template>
  `,
})
export default class HomeComponent {
  private ssrData = toSignal(injectLoad<typeof load>());

  private activeSsr = computed(() => this.ssrData()?.active ?? []);
  private gamepointsSsr = computed(() => this.ssrData()?.gamepoints ?? []);

  activePairings = injectLivePairings<ActivePairing[]>('/api/pairings/active', this.activeSsr);
  private gamepoints = injectLivePairings<GamePoint[]>('/api/gamepoints', this.gamepointsSsr);

  // Result for a pairing, if one has been entered yet (undefined otherwise).
  protected pointsFor(pairingId: number): GamePoint | undefined {
    return this.gamepoints().find((g) => g.pairingID === pairingId);
  }

  // A game is "running" once its start time has passed; everything still in the
  // future within the active window is "upcoming".
  protected runningPairings = computed(() => {
    const now = Date.now();
    return this.activePairings().filter((p) => new Date(p.startTime).getTime() <= now);
  });

  protected upcomingPairings = computed(() => {
    const now = Date.now();
    return this.activePairings().filter((p) => new Date(p.startTime).getTime() > now);
  });

  protected getPhaseName = getPhaseName;
}
