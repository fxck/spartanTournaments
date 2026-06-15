import { Component, computed, afterRenderEffect, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './results.server';
import { phaseLabel } from '../../shared/phase-name';
import { isFinals } from 'calc-tournament';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-results',
  imports: [DatePipe, RouterLink, ...HlmTableImports, HlmButton],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Ergebnisse</h1>
        <p class="text-muted-foreground mt-2">Alle abgeschlossenen und laufenden Spiele.</p>
      </header>

      <!-- Mobile: Karten (Namen untereinander mit eigenem Punktestand) -->
      <div class="space-y-3 md:hidden">
        @for (p of results(); track p.id) {
          <div
            [id]="p.id === firstOpenId() ? 'first-open-m' : null"
            class="border rounded-xl shadow-sm overflow-hidden bg-card"
          >
            <!-- Header band: court + time, plus score entry action -->
            <div class="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
              <span class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-bold text-primary leading-none truncate">Court {{ p.court }}</span>
                <span class="flex items-center gap-1 text-muted-foreground shrink-0">
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
                  <span class="text-sm font-bold tabular-nums leading-none">{{ p.startTime | date: 'HH:mm' }}</span>
                </span>
              </span>
              @if (
                canEdit() &&
                p.competitor1 &&
                p.competitor1.id &&
                p.competitor1.id > 0 &&
                p.competitor2 &&
                p.competitor2.id &&
                p.competitor2.id > 0
              ) {
                <a
                  hlmBtn
                  variant="outline"
                  size="sm"
                  [routerLink]="['/referee', p.id]"
                  [queryParams]="{ from: 'results' }"
                  class="-mr-1 h-7 font-black tabular-nums shrink-0"
                >
                  {{ p.points ? p.points.competitor1Points + ':' + p.points.competitor2Points : 'Eintragen' }}
                </a>
              }
            </div>
            <div class="relative px-4 py-4 space-y-2">
              <div class="flex items-baseline justify-between gap-3">
                @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                  <a
                    [routerLink]="['/competitor', p.competitor1.id]"
                    class="min-w-0 break-words hover:underline hover:text-primary transition-colors"
                    [class.font-bold]="!!p.points && p.points.competitor1Points > p.points.competitor2Points"
                  >
                    {{ p.competitor1.name }}
                  </a>
                } @else {
                  <span class="min-w-0 text-muted-foreground italic">Offen</span>
                }
                <span class="font-black text-xl tabular-nums shrink-0">{{
                  p.points ? p.points.competitor1Points : '–'
                }}</span>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                  <a
                    [routerLink]="['/competitor', p.competitor2.id]"
                    class="min-w-0 break-words hover:underline hover:text-primary transition-colors"
                    [class.font-bold]="!!p.points && p.points.competitor2Points > p.points.competitor1Points"
                  >
                    {{ p.competitor2.name }}
                  </a>
                } @else {
                  <span class="min-w-0 text-muted-foreground italic">Offen</span>
                }
                <span class="font-black text-xl tabular-nums shrink-0">{{
                  p.points ? p.points.competitor2Points : '–'
                }}</span>
              </div>
              <span class="absolute bottom-1 right-2 font-mono text-[10px] text-muted-foreground/40">{{
                isFinals(p) ? phaseLabel(p) : '#' + (p.gamenumber > 0 ? p.gamenumber : '-')
              }}</span>
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
              <tr hlmTr [id]="p.id === firstOpenId() ? 'first-open-d' : null">
                <td hlmTd class="w-16 text-muted-foreground" [class.font-mono]="!isFinals(p)">
                  {{ isFinals(p) ? phaseLabel(p) : p.gamenumber > 0 ? p.gamenumber : '-' }}
                </td>
                <td hlmTd>
                  <div class="flex items-center gap-4">
                    @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                      <a
                        [routerLink]="['/competitor', p.competitor1.id]"
                        class="flex-1 text-right hover:underline hover:text-primary transition-colors"
                        [class.font-bold]="!!p.points && p.points.competitor1Points > p.points.competitor2Points"
                      >
                        {{ p.competitor1.name }}
                      </a>
                    } @else {
                      <span class="flex-1 text-right text-muted-foreground italic">Offen</span>
                    }
                    <span class="text-muted-foreground/50 text-xs font-bold italic">VS</span>
                    @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                      <a
                        [routerLink]="['/competitor', p.competitor2.id]"
                        class="flex-1 hover:underline hover:text-primary transition-colors"
                        [class.font-bold]="!!p.points && p.points.competitor2Points > p.points.competitor1Points"
                      >
                        {{ p.competitor2.name }}
                      </a>
                    } @else {
                      <span class="flex-1 text-muted-foreground italic">Offen</span>
                    }
                  </div>
                </td>
                <td hlmTd class="w-28 text-center border-l bg-muted/20">
                  @if (
                    canEdit() &&
                    p.competitor1 &&
                    p.competitor1.id &&
                    p.competitor1.id > 0 &&
                    p.competitor2 &&
                    p.competitor2.id &&
                    p.competitor2.id > 0
                  ) {
                    <a
                      hlmBtn
                      variant="outline"
                      size="sm"
                      [routerLink]="['/referee', p.id]"
                      [queryParams]="{ from: 'results' }"
                      class="shadow-sm font-black text-base tabular-nums"
                    >
                      @if (p.points) {
                        {{ p.points.competitor1Points }}:{{ p.points.competitor2Points }}
                      } @else {
                        -:-
                      }
                    </a>
                  } @else if (p.points) {
                    <span class="font-black text-xl tabular-nums"
                      >{{ p.points.competitor1Points }}:{{ p.points.competitor2Points }}</span
                    >
                  } @else {
                    <span class="text-muted-foreground/30 font-normal text-xl">-:-</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="3" class="text-center py-24 text-muted-foreground italic">
                  Noch keine Spiele geplant.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export default class ResultsPage {
  protected phaseLabel = phaseLabel;
  protected isFinals = isFinals;
  data = toSignal(injectLoad<typeof load>());

  pairings = computed(() => this.data()?.pairings ?? []);
  gamepoints = computed(() => this.data()?.gamepoints ?? []);
  role = computed(() => this.data()?.role ?? null);

  canEdit = computed(() => this.role() === 'admin' || this.role() === 'referee');

  results = computed(() => {
    const pairings = this.pairings();
    const gps = this.gamepoints();
    return pairings.map((p) => ({
      ...p,
      points: gps.find((g) => g.pairingID === p.id),
    }));
  });

  // First game that has no result entered yet — used as the scroll anchor on load.
  firstOpenId = computed(() => this.results().find((p) => !p.points)?.id ?? null);

  private hasScrolled = false;

  constructor() {
    // Scroll to the first open game once, after the rows have rendered.
    afterRenderEffect(() => {
      if (this.hasScrolled || this.firstOpenId() === null) return;
      // Both layouts render the anchor; scroll to whichever is currently visible.
      const el =
        [document.getElementById('first-open-d'), document.getElementById('first-open-m')].find(
          (e) => e && e.offsetParent !== null,
        ) ?? null;
      if (el) {
        this.hasScrolled = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}
