import {  Component, inject, computed, signal, effect , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './[id].server';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-competitor-detail',
  imports: [CommonModule, ...HlmTableImports, ...HlmTabsImports],
  template: `
    <div class="space-y-8">
      @if (data()?.competitor; as c) {
        <header>
          <div class="flex items-center gap-4 text-muted-foreground mb-2">
            <span class="text-sm font-medium uppercase tracking-widest text-primary">Teilnehmer Profil</span>
          </div>
          <h1 class="text-4xl font-bold tracking-tight">{{ c.name }}</h1>
          <p class="text-muted-foreground mt-2">
            Gruppe {{ c.groupID ?? 'N/A' }} | Losnummer: {{ c.drawNumber ?? 'N/A' }}
          </p>
        </header>

        <div hlmTabs tab="schedule" class="w-full">
          <hlm-tabs-list class="grid w-full grid-cols-2 shadow-sm">
            <button hlmTabsTrigger="schedule">Eigene Spiele</button>
            <button hlmTabsTrigger="group">Gruppe & Ranking</button>
          </hlm-tabs-list>

          <!-- Schedule & Results -->
          <div hlmTabsContent="schedule" class="mt-6">
            <div hlmTableContainer class="border rounded-lg overflow-hidden shadow-sm">
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh class="w-16">Nr.</th>
                    <th hlmTh class="w-32">Zeit / Court</th>
                    <th hlmTh>Gegner</th>
                    <th hlmTh class="w-24 text-center border-l">Ergebnis</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (p of myPairings(); track p.id) {
                    <tr hlmTr>
                      <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber > 0 ? p.gamenumber : '-' }}</td>
                      <td hlmTd class="w-32">
                        <div class="font-medium">{{ p.startTime | date:'HH:mm' }}</div>
                        <div class="text-xs text-muted-foreground">Court {{ p.court }}</div>
                      </td>
                      <td hlmTd>
                        @let opp = getOpponent(p);
                        @if (opp && opp.id && opp.id > 0) {
                          <span class="font-bold text-primary">{{ opp.name }}</span>
                        } @else {
                          <span class="font-semibold text-muted-foreground italic">Offen</span>
                        }
                      </td>
                      <td hlmTd class="w-24 text-center font-black text-lg bg-muted/10 border-l">
                        @if (p.points) {
                          <span [class.text-green-600]="isWinner(p)" [class.text-red-600]="isLoser(p)">
                            {{ getMyPoints(p) }}:{{ getOpponentPoints(p) }}
                          </span>
                        } @else {
                          <span class="text-muted-foreground/30 font-normal">-:-</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr hlmTr>
                      <td hlmTd colspan="4" class="text-center py-12 text-muted-foreground italic">Noch keine Spiele für diesen Teilnehmer.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Group Ranking -->
          <div hlmTabsContent="group" class="mt-6">
            @for (group of data()?.groups; track group.id) {
              <div class="space-y-4">
                <h3 class="text-xl font-bold">Gruppe {{ group.id }} Ranking</h3>
                <div hlmTableContainer class="border rounded-lg overflow-hidden shadow-sm">
                  <table hlmTable>
                    <thead hlmTHead>
                      <tr hlmTr>
                        <th hlmTh class="w-12 text-center">#</th>
                        <th hlmTh>Name</th>
                        <th hlmTh class="w-20 text-center">MP</th>
                        <th hlmTh class="w-20 text-center border-l">Diff</th>
                      </tr>
                    </thead>
                    <tbody hlmTBody>
                      @for (comp of group.competitors; track comp.id; let i = $index) {
                        <tr hlmTr [class.bg-primary/10]="comp.id === c.id">
                          <td hlmTd class="w-12 text-center font-bold">{{ i + 1 }}</td>
                          <td hlmTd class="font-medium">
                            {{ comp.name }} @if(comp.id === c.id){ <span class="text-xs text-muted-foreground ml-1">(Du)</span> }
                          </td>
                          <td hlmTd class="w-20 text-center font-bold">{{ comp.matchPoints }}</td>
                          <td hlmTd class="w-20 text-center font-mono border-l">{{ comp.diff > 0 ? '+' : '' }}{{ comp.diff }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @empty {
              <div class="py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground italic">
                Dieser Teilnehmer ist noch keiner Gruppe zugewiesen.
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="py-24 text-center">
          <h2 class="text-2xl font-bold">Teilnehmer nicht gefunden</h2>
          <p class="text-muted-foreground mt-2">Der gesuchte Teilnehmer existiert nicht oder wurde gelöscht.</p>
        </div>
      }
    </div>
  `,
})
export default class CompetitorDetailPage {
  data = toSignal(injectLoad<typeof load>());
  
  myPairings = computed(() => {
    const d = this.data();
    const c = d?.competitor;
    if (!c) return [];
    const gps = d.gamepoints ?? [];
    const pairings = d.pairings ?? [];
    return pairings
      .filter((p: any) => p.competitor1.id === c.id || p.competitor2.id === c.id)
      .map((p: any) => ({
        ...p,
        points: gps.find((g: any) => g.pairingID === p.id)
      }));
  });

  getOpponent(p: any) {
    const c = this.data()?.competitor;
    return p.competitor1.id === c?.id ? p.competitor2 : p.competitor1;
  }

  getMyPoints(p: any) {
    const c = this.data()?.competitor;
    const pnts = p.points;
    if (!pnts) return 0;
    return p.competitor1.id === c?.id ? pnts.competitor1Points : pnts.competitor2Points;
  }

  getOpponentPoints(p: any) {
    const c = this.data()?.competitor;
    const pnts = p.points;
    if (!pnts) return 0;
    return p.competitor1.id === c?.id ? pnts.competitor2Points : pnts.competitor1Points;
  }

  isWinner(p: any) {
    if (!p.points) return false;
    return this.getMyPoints(p) > this.getOpponentPoints(p);
  }

  isLoser(p: any) {
    if (!p.points) return false;
    return this.getMyPoints(p) < this.getOpponentPoints(p);
  }
}
