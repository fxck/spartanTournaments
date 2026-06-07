import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './gameplan.server';
import { getPhaseName } from '../../shared/phase-name';
import { injectLivePairings } from '../../shared/live-pairings';

type PairingRow = Awaited<ReturnType<typeof load>>[number];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gameplan',
  imports: [CommonModule, RouterLink, ...HlmTableImports],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Spielplan</h1>
        <p class="text-muted-foreground mt-2">Vollständiger Zeitplan des Turniers (chronologisch).</p>
      </header>

      <!-- Mobile: Karten-Ansicht (Namen untereinander, brechen sauber um) -->
      <div class="space-y-3 md:hidden">
        @for (p of pairings(); track p.id) {
          <div class="border rounded-lg p-4 shadow-sm" [class]="p.groupID < 0 ? 'bg-primary/5' : ''">
            <div class="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3 text-xs">
              <span class="px-2 py-0.5 rounded font-bold"
                    [class.bg-secondary]="p.groupID > 0"
                    [class.bg-primary]="p.groupID < 0"
                    [class.text-primary-foreground]="p.groupID < 0">
                {{ p.groupID > 0 ? 'Gruppe ' + p.groupID : getPhaseName(p.round) }}
              </span>
              <span class="font-medium">{{ p.startTime | date:'HH:mm' }} Uhr</span>
              <span class="text-muted-foreground">Court {{ p.court }}</span>
              <span class="ml-auto font-mono text-muted-foreground">#{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</span>
            </div>
            <div class="space-y-1 text-center">
              @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                <a [routerLink]="['/competitor', p.competitor1.id]"
                   class="block font-semibold break-words hover:underline hover:text-primary transition-colors">
                  {{ p.competitor1.name }}
                </a>
              } @else {
                <span class="block font-semibold text-muted-foreground italic">Offen</span>
              }
              <span class="block text-muted-foreground/50 text-xs font-black italic">VS</span>
              @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                <a [routerLink]="['/competitor', p.competitor2.id]"
                   class="block font-semibold break-words hover:underline hover:text-primary transition-colors">
                  {{ p.competitor2.name }}
                </a>
              } @else {
                <span class="block font-semibold text-muted-foreground italic">Offen</span>
              }
            </div>
          </div>
        } @empty {
          <div class="text-center py-24 text-muted-foreground italic">Der Spielplan wurde noch nicht generiert.</div>
        }
      </div>

      <!-- Desktop: Tabelle -->
      <div hlmTableContainer class="hidden md:block border rounded-lg overflow-hidden shadow-sm">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-16">Nr.</th>
              <th hlmTh class="w-32 text-center text-primary">Runde</th>
              <th hlmTh class="w-32">Zeit</th>
              <th hlmTh class="w-24 text-center">Court</th>
              <th hlmTh>Begegnung</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of pairings(); track p.id) {
              <tr hlmTr [class]="p.groupID < 0 ? 'bg-primary/5' : ''">
                <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                <td hlmTd class="w-32 text-center">
                  <span class="px-2 py-1 rounded text-xs font-bold"
                        [class.bg-secondary]="p.groupID > 0"
                        [class.bg-primary]="p.groupID < 0"
                        [class.text-primary-foreground]="p.groupID < 0">
                    {{ p.groupID > 0 ? 'Gruppe ' + p.groupID : getPhaseName(p.round) }}
                  </span>
                </td>
                <td hlmTd class="w-32 font-medium">{{ p.startTime | date:'HH:mm' }} Uhr</td>
                <td hlmTd class="w-24 text-center">{{ p.court }}</td>
                <td hlmTd>
                  <div class="flex items-center gap-4 text-lg">
                    @if (p.competitor1 && p.competitor1.id && p.competitor1.id > 0) {
                      <a [routerLink]="['/competitor', p.competitor1.id]"
                         class="flex-1 min-w-0 text-right font-semibold break-words hover:underline hover:text-primary transition-colors">
                        {{ p.competitor1.name }}
                      </a>
                    } @else {
                      <span class="flex-1 text-right font-semibold text-muted-foreground italic">Offen</span>
                    }
                    <span class="text-muted-foreground/50 text-xs font-black italic">VS</span>
                    @if (p.competitor2 && p.competitor2.id && p.competitor2.id > 0) {
                      <a [routerLink]="['/competitor', p.competitor2.id]"
                         class="flex-1 min-w-0 font-semibold break-words hover:underline hover:text-primary transition-colors">
                        {{ p.competitor2.name }}
                      </a>
                    } @else {
                      <span class="flex-1 font-semibold text-muted-foreground italic">Offen</span>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="5" class="text-center py-24 text-muted-foreground italic">Der Spielplan wurde noch nicht generiert.</td>
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

  protected getPhaseName = getPhaseName;
}
