import { Component, computed } from '@angular/core';
import { injectLoad } from '@analogjs/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './index.server';

@Component({
  selector: 'app-home',
  standalone: true,
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
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Court {{ pairing.court }}</span>
              <span class="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">G{{ pairing.groupID }}</span>
            </div>
            
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1 text-center">
                <div class="font-bold text-lg">{{ pairing.competitor1.name }}</div>
              </div>
              <div class="text-2xl font-black text-muted-foreground/30 italic">VS</div>
              <div class="flex-1 text-center">
                <div class="font-bold text-lg">{{ pairing.competitor2.name }}</div>
              </div>
            </div>
            
            <div class="mt-6 text-center text-sm text-muted-foreground">
              Beginn: {{ pairing.startTime | date:'HH:mm' }} Uhr
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
            <p class="text-muted-foreground text-lg">Aktuell laufen keine Spiele oder alle Ergebnisse sind bereits erfasst.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export default class HomeComponent {
  private _data = toSignal(injectLoad<typeof load>(), { initialValue: [] });
  activePairings = computed(() => {
    const d = this._data();
    return Array.isArray(d) ? d : [];
  });
}
