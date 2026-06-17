import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './gameplan.server';
import { phaseLabel } from '../../shared/phase-name';
import { isFinals, isGroups } from 'calc-tournament';
import { injectLivePairings } from '../../shared/live-pairings';
import { PairingHeaderComponent } from '../../shared/pairing-header.component';

type PairingRow = Awaited<ReturnType<typeof load>>[number];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gameplan',
  imports: [CommonModule, RouterLink, ...HlmTableImports, PairingHeaderComponent],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Spielplan</h1>
        <p class="text-muted-foreground mt-2">Vollständiger Zeitplan des Turniers (chronologisch).</p>
      </header>

      <!-- Mobile: Karten-Ansicht (Namen untereinander, brechen sauber um) -->
      <div class="space-y-3 md:hidden">
        @for (p of pairings(); track p.id) {
          <div class="border rounded-xl shadow-sm overflow-hidden" [class]="isFinals(p) ? 'bg-primary/5' : 'bg-card'">
            <!-- Header band: time (primary accent) + phase/group left, court in its own panel right -->
            <app-pairing-header [pairing]="p" />

            <!-- Matchup -->
            <div class="relative px-4 py-4 space-y-1 text-center">
              @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                <a
                  [routerLink]="['/competitor', p.competitor1.id]"
                  class="block font-semibold break-words hover:underline hover:text-primary transition-colors"
                >
                  {{ p.competitor1.name }}
                </a>
              } @else {
                <span class="block font-semibold text-muted-foreground italic">Offen</span>
              }
              <span class="block text-muted-foreground/50 text-xs font-black italic">VS</span>
              @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                <a
                  [routerLink]="['/competitor', p.competitor2.id]"
                  class="block font-semibold break-words hover:underline hover:text-primary transition-colors"
                >
                  {{ p.competitor2.name }}
                </a>
              } @else {
                <span class="block font-semibold text-muted-foreground italic">Offen</span>
              }
              <span class="absolute bottom-1.5 right-2 font-mono text-[10px] text-muted-foreground/40"
                >#{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</span
              >
            </div>
          </div>
        } @empty {
          <div class="text-center py-24 text-muted-foreground italic">Der Spielplan wurde noch nicht generiert.</div>
        }
      </div>

      <!-- Desktop: Tabelle -->
      <div hlmTableContainer class="hidden md:block border rounded-lg overflow-hidden shadow-sm">
        <table hlmTable class="w-full table-fixed">
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-12">Nr.</th>
              <th hlmTh class="w-32 text-center">Runde</th>
              <th hlmTh class="w-24">Zeit</th>
              <th hlmTh class="w-16 text-center">Bahn</th>
              <th hlmTh class="text-center">Begegnung</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of pairings(); track p.id) {
              <tr hlmTr [class]="isFinals(p) ? 'bg-primary/5' : ''">
                <td hlmTd class="w-12 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                <td hlmTd class="w-32 text-center">
                  <span
                    class="px-2 py-1 rounded text-xs font-bold"
                    [class.bg-secondary]="isGroups(p)"
                    [class.bg-primary]="isFinals(p)"
                    [class.text-primary-foreground]="isFinals(p)"
                  >
                    {{ phaseLabel(p) }}
                  </span>
                </td>
                <td hlmTd class="w-24 font-medium">{{ p.startTime | date: 'HH:mm' }} Uhr</td>
                <td hlmTd class="w-16 text-center">{{ p.court }}</td>
                <td hlmTd>
                  <div class="flex items-center gap-3">
                    @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                      <a
                        [routerLink]="['/competitor', p.competitor1.id]"
                        [title]="p.competitor1.name"
                        class="flex-1 min-w-0 text-right font-semibold truncate hover:underline hover:text-primary transition-colors"
                      >
                        {{ p.competitor1.name }}
                      </a>
                    } @else {
                      <span class="flex-1 min-w-0 text-right font-semibold text-muted-foreground italic">Offen</span>
                    }
                    <span class="shrink-0 text-muted-foreground/50 text-xs font-black italic">VS</span>
                    @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                      <a
                        [routerLink]="['/competitor', p.competitor2.id]"
                        [title]="p.competitor2.name"
                        class="flex-1 min-w-0 font-semibold truncate hover:underline hover:text-primary transition-colors"
                      >
                        {{ p.competitor2.name }}
                      </a>
                    } @else {
                      <span class="flex-1 min-w-0 font-semibold text-muted-foreground italic">Offen</span>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="5" class="text-center py-24 text-muted-foreground italic">
                  Der Spielplan wurde noch nicht generiert.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export default class GameplanPage {
  private ssrData = toSignal(injectLoad<typeof load>(), { initialValue: [] as PairingRow[] });

  pairings = injectLivePairings<PairingRow[]>('/api/pairings', this.ssrData);

  protected phaseLabel = phaseLabel;
  protected isFinals = isFinals;
  protected isGroups = isGroups;
}
