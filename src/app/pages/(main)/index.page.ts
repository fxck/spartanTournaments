import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { injectLoad } from '@analogjs/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './index.server';
import { getPhaseName } from '../../shared/phase-name';
import { injectLivePairings } from '../../shared/live-pairings';

type ActivePairing = Awaited<ReturnType<typeof load>>[number];

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
      <div
        class="border rounded-lg p-6 shadow-sm"
        [class.bg-card]="!live"
        [class.bg-green-50]="live"
        [class.border-green-500]="live"
        [class.ring-1]="live"
        [class.ring-green-500]="live"
      >
        <div class="flex justify-between items-start mb-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Court {{ pairing.court }}</span>
          <span class="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">
            {{ pairing.groupID > 0 ? 'Gruppe ' + pairing.groupID : getPhaseName(pairing.round) }}
          </span>
        </div>

        <div class="flex flex-col items-center gap-2">
          <div
            class="w-full text-center font-bold text-lg leading-tight break-words"
            [class.text-muted-foreground]="!pairing.competitor1?.id"
            [class.italic]="!pairing.competitor1?.id"
          >
            {{ pairing.competitor1?.name ?? 'Offen' }}
          </div>
          <div class="text-sm font-black uppercase tracking-widest text-muted-foreground/40 italic">vs</div>
          <div
            class="w-full text-center font-bold text-lg leading-tight break-words"
            [class.text-muted-foreground]="!pairing.competitor2?.id"
            [class.italic]="!pairing.competitor2?.id"
          >
            {{ pairing.competitor2?.name ?? 'Offen' }}
          </div>
        </div>

        <div class="mt-6 text-center text-sm" [class.text-green-700]="live" [class.text-muted-foreground]="!live">
          {{ live ? 'Läuft seit' : 'Beginn' }}: {{ pairing.startTime | date: 'HH:mm' }} Uhr
        </div>
      </div>
    </ng-template>
  `,
})
export default class HomeComponent {
  private ssrData = toSignal(injectLoad<typeof load>(), { initialValue: [] as ActivePairing[] });

  activePairings = injectLivePairings<ActivePairing[]>('/api/pairings/active', this.ssrData);

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
