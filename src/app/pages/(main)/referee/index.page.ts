import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { injectLoad, defineRouteMeta } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { refereeGuard } from '../../../auth.guard';
import type { load } from './index.server';

export const routeMeta = defineRouteMeta({
  canActivate: [refereeGuard],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-referee-overview',
  imports: [
    CommonModule,
    RouterLink,
    ...HlmTableImports,
    HlmButton,
  ],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Schiedsrichter Bereich</h1>
        <p class="text-muted-foreground mt-2">Offene Spiele ohne eingetragenes Ergebnis, sortiert nach Startzeit.</p>
      </header>

      <!-- Mobile: Karten -->
      <div class="space-y-3 md:hidden">
        @for (p of pairings(); track p.id) {
          <div class="border rounded-lg p-4 shadow-sm bg-card">
            <div class="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span class="font-mono">#{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</span>
              <span class="flex items-center gap-2">
                <span class="font-semibold text-foreground">{{ p.startTime | date:'HH:mm' }} Uhr</span>
                <span class="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-md">Court {{ p.court }}</span>
              </span>
            </div>
            <div class="space-y-1 text-center mb-4">
              <div class="font-medium break-words">{{ p.competitor1?.name }}</div>
              <div class="text-muted-foreground/50 text-xs italic font-bold">VS</div>
              <div class="font-medium break-words">{{ p.competitor2?.name }}</div>
            </div>
            <a hlmBtn variant="outline" size="sm" [routerLink]="['/referee', p.id]" class="w-full gap-1 shadow-sm">
              Eintragen
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground italic">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Super! Alle aktiven Spiele haben bereits ein Ergebnis.</span>
          </div>
        }
      </div>

      <!-- Desktop: Tabelle -->
      <div hlmTableContainer class="hidden md:block border rounded-lg overflow-hidden shadow-sm bg-card">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-16">Nr.</th>
              <th hlmTh class="w-32">Startzeit</th>
              <th hlmTh class="w-24">Court</th>
              <th hlmTh>Begegnung</th>
              <th hlmTh class="w-40 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of pairings(); track p.id) {
              <tr hlmTr class="hover:bg-muted/30 transition-colors">
                <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                <td hlmTd class="w-32 font-semibold">{{ p.startTime | date:'HH:mm' }} Uhr</td>
                <td hlmTd class="w-24"><span class="px-2 py-1 bg-primary/10 text-primary font-bold rounded-md text-xs">Court {{ p.court }}</span></td>
                <td hlmTd>
                  <div class="flex items-center gap-3">
                    <span class="font-medium">{{ p.competitor1?.name }}</span>
                    <span class="text-muted-foreground/50 text-xs italic font-bold">VS</span>
                    <span class="font-medium">{{ p.competitor2?.name }}</span>
                  </div>
                </td>
                <td hlmTd class="w-40 text-right">
                  <a hlmBtn variant="outline" size="sm" [routerLink]="['/referee', p.id]" class="gap-1 shadow-sm">
                    Eintragen
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </a>
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="5" class="text-center py-20 text-muted-foreground italic">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
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
