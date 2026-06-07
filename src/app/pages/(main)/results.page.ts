import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './results.server';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-results',
  imports: [
    RouterLink,
    ...HlmTableImports,
    HlmButton,
  ],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Ergebnisse</h1>
        <p class="text-muted-foreground mt-2">Alle abgeschlossenen und laufenden Spiele.</p>
      </header>

      <!-- Mobile: Karten (Namen untereinander mit eigenem Punktestand) -->
      <div class="space-y-3 md:hidden">
        @for (p of results(); track p.id) {
          <div class="border rounded-lg p-4 shadow-sm">
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="font-mono text-xs text-muted-foreground">#{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</span>
              @if (canEdit() && p.competitor1 && p.competitor1.id && p.competitor1.id > 0 && p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                <a hlmBtn variant="outline" size="sm" [routerLink]="['/referee', p.id]" class="-mr-2 h-7 font-black tabular-nums">
                  {{ p.points ? p.points.competitor1Points + ':' + p.points.competitor2Points : 'Eintragen' }}
                </a>
              }
            </div>
            <div class="space-y-2">
              <div class="flex items-baseline justify-between gap-3">
                @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                  <a [routerLink]="['/competitor', p.competitor1.id]"
                     class="min-w-0 break-words hover:underline hover:text-primary transition-colors"
                     [class.font-bold]="p.points?.competitor1Points > p.points?.competitor2Points">
                    {{ p.competitor1.name }}
                  </a>
                } @else {
                  <span class="min-w-0 text-muted-foreground italic">Offen</span>
                }
                <span class="font-black text-xl tabular-nums shrink-0">{{ p.points ? p.points.competitor1Points : '–' }}</span>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                  <a [routerLink]="['/competitor', p.competitor2.id]"
                     class="min-w-0 break-words hover:underline hover:text-primary transition-colors"
                     [class.font-bold]="p.points?.competitor2Points > p.points?.competitor1Points">
                    {{ p.competitor2.name }}
                  </a>
                } @else {
                  <span class="min-w-0 text-muted-foreground italic">Offen</span>
                }
                <span class="font-black text-xl tabular-nums shrink-0">{{ p.points ? p.points.competitor2Points : '–' }}</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-24 text-muted-foreground italic">Noch keine Spiele geplant.</div>
        }
      </div>

      <!-- Desktop: Tabelle -->
      <div hlmTableContainer class="hidden md:block border rounded-lg overflow-hidden shadow-sm">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-16">Nr.</th>
              <th hlmTh>Begegnung</th>
              <th hlmTh class="w-28 text-center border-l">Ergebnis</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of results(); track p.id) {
              <tr hlmTr>
                <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                <td hlmTd>
                  <div class="flex items-center gap-4">
                    @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                      <a [routerLink]="['/competitor', p.competitor1.id]"
                         class="flex-1 text-right hover:underline hover:text-primary transition-colors"
                         [class.font-bold]="p.points?.competitor1Points > p.points?.competitor2Points">
                        {{ p.competitor1.name }}
                      </a>
                    } @else {
                      <span class="flex-1 text-right text-muted-foreground italic">Offen</span>
                    }
                    <span class="text-muted-foreground/50 text-xs font-bold italic">VS</span>
                    @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                      <a [routerLink]="['/competitor', p.competitor2.id]"
                         class="flex-1 hover:underline hover:text-primary transition-colors"
                         [class.font-bold]="p.points?.competitor2Points > p.points?.competitor1Points">
                        {{ p.competitor2.name }}
                      </a>
                    } @else {
                      <span class="flex-1 text-muted-foreground italic">Offen</span>
                    }
                  </div>
                </td>
                <td hlmTd class="w-28 text-center border-l bg-muted/20">
                  @if (canEdit() && p.competitor1 && p.competitor1.id && p.competitor1.id > 0 && p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                    <a hlmBtn variant="outline" size="sm" [routerLink]="['/referee', p.id]" class="shadow-sm font-black text-base tabular-nums">
                      @if (p.points) {
                        {{ p.points.competitor1Points }}:{{ p.points.competitor2Points }}
                      } @else {
                        -:-
                      }
                    </a>
                  } @else if (p.points) {
                    <span class="font-black text-xl tabular-nums">{{ p.points.competitor1Points }}:{{ p.points.competitor2Points }}</span>
                  } @else {
                    <span class="text-muted-foreground/30 font-normal text-xl">-:-</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="3" class="text-center py-24 text-muted-foreground italic">Noch keine Spiele geplant.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export default class ResultsPage {
  data = toSignal(injectLoad<typeof load>());

  pairings = computed(() => this.data()?.pairings ?? []);
  gamepoints = computed(() => this.data()?.gamepoints ?? []);
  role = computed(() => this.data()?.role ?? null);

  canEdit = computed(() => this.role() === 'admin' || this.role() === 'referee');

  results = computed(() => {
    const pairings = this.pairings();
    const gps = this.gamepoints();
    return pairings.map((p: any) => ({
      ...p,
      points: gps.find((g: any) => g.pairingID === p.id)
    }));
  });
}
