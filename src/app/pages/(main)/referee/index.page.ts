import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { injectLoad, defineRouteMeta } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { refereeGuard } from '../../../auth.guard';
import { PairingHeaderComponent } from '../../../shared/pairing-header.component';
import type { load } from './index.server';

export const routeMeta = defineRouteMeta({
  canActivate: [refereeGuard],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-referee-overview',
  imports: [CommonModule, RouterLink, ...HlmTableImports, HlmButton, PairingHeaderComponent],
  template: `
    <div class="space-y-8">
      <header>
        <h1
          class="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
        >
          Schiedsrichter Bereich
        </h1>
        <p class="text-muted-foreground mt-2">Offene Spiele ohne eingetragenes Ergebnis, sortiert nach Startzeit.</p>
      </header>

      <!-- Mobile: Karten -->
      <div class="space-y-3 md:hidden">
        @for (p of pairings(); track p.id) {
          <a
            [routerLink]="['/referee', p.id]"
            class="block border rounded-xl shadow-sm bg-card overflow-hidden active:bg-muted/40 transition-colors"
          >
            <!-- Prominent header: start time (primary accent) + court are what referees scan for -->
            <app-pairing-header [pairing]="p" />

            <!-- Matchup -->
            <div class="relative px-4 py-4 space-y-1 text-center">
              <div class="font-medium break-words">{{ p.competitor1?.name }}</div>
              <div class="text-muted-foreground/50 text-xs italic font-bold">VS</div>
              <div class="font-medium break-words">{{ p.competitor2?.name }}</div>
              <span class="absolute bottom-1.5 right-2 font-mono text-[10px] text-muted-foreground/40"
                >#{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</span
              >
            </div>
          </a>
        } @empty {
          <div class="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground italic">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Super! Alle aktiven Spiele haben bereits ein Ergebnis.</span>
          </div>
        }
      </div>

      <!-- Desktop: Tabelle -->
      <div hlmTableContainer class="hidden md:block border rounded-lg overflow-hidden shadow-sm bg-card">
        <table hlmTable class="w-full table-fixed">
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-16">Nr.</th>
              <th hlmTh class="w-36">Startzeit</th>
              <th hlmTh class="w-24">Bahn</th>
              <th hlmTh class="text-center">Begegnung</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of pairings(); track p.id) {
              <tr hlmTr class="hover:bg-muted/30 transition-colors">
                <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                <td hlmTd class="w-36">
                  <a
                    hlmBtn
                    variant="outline"
                    size="sm"
                    [routerLink]="['/referee', p.id]"
                    class="gap-1 shadow-sm font-semibold"
                  >
                    {{ p.startTime | date: 'HH:mm' }} Uhr
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </td>
                <td hlmTd class="w-24">
                  <span class="px-2 py-1 bg-muted text-muted-foreground font-bold rounded-md text-xs"
                    >Bahn {{ p.court }}</span
                  >
                </td>
                <td hlmTd>
                  <div class="flex items-center gap-3">
                    <span class="flex-1 min-w-0 text-right font-medium truncate" [title]="p.competitor1?.name">{{
                      p.competitor1?.name
                    }}</span>
                    <span class="shrink-0 text-muted-foreground/50 text-xs italic font-bold">VS</span>
                    <span class="flex-1 min-w-0 font-medium truncate" [title]="p.competitor2?.name">{{
                      p.competitor2?.name
                    }}</span>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="4" class="text-center py-20 text-muted-foreground italic">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-10 w-10 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Super! Alle aktiven Spiele haben bereits ein Ergebnis.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export default class RefereeOverviewPage {
  data = toSignal(injectLoad<typeof load>());
  pairings = computed(() => this.data()?.pairings ?? []);
}
