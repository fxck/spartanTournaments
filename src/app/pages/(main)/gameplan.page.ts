import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './gameplan.server';
import { phaseLabel } from '../../shared/phase-name';
import { isFinals, isGroups } from 'calc-tournament';
import { injectLivePairings } from '../../shared/live-pairings';
import { PairingHeaderComponent } from '../../shared/pairing-header.component';

type LoadData = Awaited<ReturnType<typeof load>>;
type PairingRow = LoadData['pairings'][number];

type StatusFilter = 'all' | 'open' | 'played';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gameplan',
  imports: [CommonModule, RouterLink, ...HlmTableImports, HlmButton, ...HlmSelectImports, PairingHeaderComponent],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Spielplan</h1>
        <p class="text-muted-foreground mt-2">Vollständiger Zeitplan des Turniers (chronologisch).</p>
      </header>

      <!-- Filter -->
      <div class="rounded-xl border bg-card shadow-sm p-4">
        <div class="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Status
            <hlm-select
              class="w-full sm:w-40"
              [value]="status()"
              [itemToString]="statusToString"
              (valueChange)="status.set($any($event))"
            >
              <hlm-select-trigger class="w-full">
                <hlm-select-value />
              </hlm-select-trigger>
              <hlm-select-content *hlmSelectPortal>
                <hlm-select-item value="all">Alle</hlm-select-item>
                <hlm-select-item value="open">Offen</hlm-select-item>
                <hlm-select-item value="played">Gespielt</hlm-select-item>
              </hlm-select-content>
            </hlm-select>
          </div>

          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Gruppe
            <hlm-select-multiple class="w-full sm:w-44" [value]="groups()" (valueChange)="groups.set($any($event))">
              <hlm-select-trigger class="w-full">
                <hlm-select-placeholder>Alle Gruppen</hlm-select-placeholder>
                <ng-template hlmSelectValues let-values>
                  <hlm-select-values-content>
                    {{ values.length === 1 ? 'Gruppe ' + values[0] : values.length + ' Gruppen' }}
                  </hlm-select-values-content>
                </ng-template>
              </hlm-select-trigger>
              <hlm-select-content *hlmSelectPortal>
                @for (g of groupOptions(); track g) {
                  <hlm-select-item [value]="g">Gruppe {{ g }}</hlm-select-item>
                }
              </hlm-select-content>
            </hlm-select-multiple>
          </div>

          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Bahn
            <hlm-select-multiple class="w-full sm:w-44" [value]="courts()" (valueChange)="courts.set($any($event))">
              <hlm-select-trigger class="w-full">
                <hlm-select-placeholder>Alle Bahnen</hlm-select-placeholder>
                <ng-template hlmSelectValues let-values>
                  <hlm-select-values-content>
                    {{ values.length === 1 ? 'Bahn ' + values[0] : values.length + ' Bahnen' }}
                  </hlm-select-values-content>
                </ng-template>
              </hlm-select-trigger>
              <hlm-select-content *hlmSelectPortal>
                @for (c of courtOptions(); track c) {
                  <hlm-select-item [value]="c">Bahn {{ c }}</hlm-select-item>
                }
              </hlm-select-content>
            </hlm-select-multiple>
          </div>

          @if (hasActiveFilter()) {
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="resetFilters()"
              class="col-span-2 sm:col-span-1 sm:ml-auto"
            >
              Filter zurücksetzen
            </button>
          }
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          {{ pairings().length }} {{ pairings().length === 1 ? 'Spiel' : 'Spiele' }}
        </p>
      </div>

      <!-- Mobile: Karten-Ansicht (Namen untereinander, brechen sauber um) -->
      <div class="space-y-3 md:hidden">
        @for (p of pairings(); track p.id) {
          <div class="border rounded-xl shadow-sm overflow-hidden" [class]="isFinals(p) ? 'bg-primary/5' : 'bg-card'">
            <!-- Header band: time (primary accent) + phase/group left, court in its own panel right -->
            <app-pairing-header [pairing]="p">
              <span class="flex-1 flex justify-center min-w-0">
                @if (canEdit() && bothAssigned(p)) {
                  <a
                    hlmBtn
                    variant="outline"
                    size="sm"
                    [routerLink]="['/referee', p.id]"
                    [queryParams]="{ from: 'gameplan' }"
                    class="h-7 font-black tabular-nums shrink-0"
                  >
                    {{ p.points ? p.points.competitor1Points + ':' + p.points.competitor2Points : 'Eintragen' }}
                  </a>
                }
              </span>
            </app-pairing-header>

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
          <div class="text-center py-24 text-muted-foreground italic">{{ emptyMessage() }}</div>
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
              @if (canEdit()) {
                <th hlmTh class="w-28 text-center border-l">Ergebnis</th>
              }
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
                @if (canEdit()) {
                  <td hlmTd class="w-28 text-center border-l bg-muted/20">
                    @if (bothAssigned(p)) {
                      <a
                        hlmBtn
                        variant="outline"
                        size="sm"
                        [routerLink]="['/referee', p.id]"
                        [queryParams]="{ from: 'gameplan' }"
                        class="shadow-sm font-black tabular-nums"
                      >
                        {{ p.points ? p.points.competitor1Points + ':' + p.points.competitor2Points : 'Eintragen' }}
                      </a>
                    } @else {
                      <span class="text-muted-foreground/30 font-normal">-:-</span>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd [attr.colspan]="canEdit() ? 6 : 5" class="text-center py-24 text-muted-foreground italic">
                  {{ emptyMessage() }}
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
  private ssrData = toSignal(injectLoad<typeof load>());

  private allPairingsSsr = computed(() => this.ssrData()?.pairings ?? []);
  private allPairings = injectLivePairings<PairingRow[]>('/api/pairings', this.allPairingsSsr);

  protected role = computed(() => this.ssrData()?.role ?? null);
  protected canEdit = computed(() => this.role() === 'admin' || this.role() === 'referee');

  // Filter state. Gruppe and Bahn are multi-select (empty array = no restriction).
  protected status = signal<StatusFilter>('all');
  protected groups = signal<number[]>([]);
  protected courts = signal<number[]>([]);

  // Filter option lists, derived from the full schedule.
  protected groupOptions = computed(() =>
    [
      ...new Set(
        this.allPairings()
          .filter((p) => isGroups(p))
          .map((p) => p.groupID),
      ),
    ].sort((a, b) => a - b),
  );
  protected courtOptions = computed(() => [...new Set(this.allPairings().map((p) => p.court))].sort((a, b) => a - b));

  // The filtered, displayed schedule.
  protected pairings = computed(() => {
    const statusF = this.status();
    const groupsF = this.groups();
    const courtsF = this.courts();

    return this.allPairings().filter((p) => {
      if (statusF === 'open' && p.points) return false;
      if (statusF === 'played' && !p.points) return false;
      if (groupsF.length && !groupsF.includes(p.groupID)) return false;
      if (courtsF.length && !courtsF.includes(p.court)) return false;
      return true;
    });
  });

  protected hasActiveFilter = computed(
    () => this.status() !== 'all' || this.groups().length > 0 || this.courts().length > 0,
  );

  protected emptyMessage = computed(() =>
    this.allPairings().length === 0
      ? 'Der Spielplan wurde noch nicht generiert.'
      : 'Keine Spiele entsprechen den gewählten Filtern.',
  );

  protected bothAssigned(p: PairingRow): boolean {
    return !!p.competitor1?.id && p.competitor1.id > 0 && !!p.competitor2?.id && p.competitor2.id > 0;
  }

  protected resetFilters() {
    this.status.set('all');
    this.groups.set([]);
    this.courts.set([]);
  }

  // Trigger display labels for the single selects (without itemToString the
  // trigger would show the raw value, e.g. "open" instead of "Offen").
  protected statusToString = (v: StatusFilter) => ({ all: 'Alle', open: 'Offen', played: 'Gespielt' })[v] ?? '';

  protected phaseLabel = phaseLabel;
  protected isFinals = isFinals;
  protected isGroups = isGroups;
}
