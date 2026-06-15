import { Component, ChangeDetectionStrategy } from '@angular/core';
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
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Aktuelle Spiele</h1>
        <p class="text-muted-foreground mt-2">Die nächsten Begegnungen auf den Courts.</p>
      </header>

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        @for (pairing of activePairings(); track pairing.id) {
          <div class="border rounded-lg p-6 bg-card shadow-sm">
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >Court {{ pairing.court }}</span
              >
              <span class="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">
                {{ pairing.groupID > 0 ? 'Gruppe ' + pairing.groupID : getPhaseName(pairing.round) }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 text-center">
                <div
                  class="font-bold text-lg"
                  [class.text-muted-foreground]="!pairing.competitor1?.id"
                  [class.italic]="!pairing.competitor1?.id"
                >
                  {{ pairing.competitor1?.name ?? 'Offen' }}
                </div>
              </div>
              <div class="text-2xl font-black text-muted-foreground/30 italic">VS</div>
              <div class="flex-1 text-center">
                <div
                  class="font-bold text-lg"
                  [class.text-muted-foreground]="!pairing.competitor2?.id"
                  [class.italic]="!pairing.competitor2?.id"
                >
                  {{ pairing.competitor2?.name ?? 'Offen' }}
                </div>
              </div>
            </div>

            <div class="mt-6 text-center text-sm text-muted-foreground">
              Beginn: {{ pairing.startTime | date: 'HH:mm' }} Uhr
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
            <p class="text-muted-foreground text-lg">
              Aktuell laufen keine Spiele oder alle Ergebnisse sind bereits erfasst.
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export default class HomeComponent {
  private ssrData = toSignal(injectLoad<typeof load>(), { initialValue: [] as ActivePairing[] });

  activePairings = injectLivePairings<ActivePairing[]>('/api/pairings/active', this.ssrData);

  protected getPhaseName = getPhaseName;
}
