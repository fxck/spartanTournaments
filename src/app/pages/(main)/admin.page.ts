import { Component as NgComponent, inject as ngInject, signal, effect, computed, resource } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { injectLoad, defineRouteMeta } from '@analogjs/router';
import { adminGuard } from '../../auth.guard';
import { CommonModule } from '@angular/common';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './admin.server';

export const routeMeta = defineRouteMeta({
  canActivate: [adminGuard],
});

@NgComponent({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    ...HlmCardImports,
    ...HlmTableImports,
    ...HlmTabsImports,
  ],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Turnier Administration</h1>
        <p class="text-muted-foreground mt-2">Verwalte dein Turnier, Teilnehmer und Spielpläne.</p>
      </header>

      <div hlmTabs tab="details" class="w-full">
        <hlm-tabs-list class="grid w-full grid-cols-3">
          <button hlmTabsTrigger="details">Einstellungen</button>
          <button hlmTabsTrigger="competitors">Teilnehmer</button>
          <button hlmTabsTrigger="actions">Aktionen</button>
        </hlm-tabs-list>

        <!-- Tournament Details -->
        <div hlmTabsContent="details" class="mt-6">
          <section hlmCard>
            <header hlmCardHeader>
              <h2 hlmCardTitle>Turnier-Details</h2>
              <p hlmCardDescription>Bearbeite die Grundkonfiguration deines Turniers.</p>
            </header>
            <form [formGroup]="detailsForm" (ngSubmit)="updateDetails()" hlmCardContent class="grid gap-6">
              <div class="grid gap-2">
                <label hlmLabel for="name">Name</label>
                <input hlmInput id="name" formControlName="name" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label hlmLabel for="numberOfParallelGames">Parallele Spiele</label>
                  <input hlmInput id="numberOfParallelGames" type="number" formControlName="numberOfParallelGames" />
                </div>
                <div class="grid gap-2">
                  <label hlmLabel for="minutesPerGame">Minuten pro Spiel</label>
                  <input hlmInput id="minutesPerGame" type="number" formControlName="minutesPerGame" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label hlmLabel for="minutesAvailForGroupsPhase">Minuten für Gruppenphase</label>
                  <input hlmInput id="minutesAvailForGroupsPhase" type="number" formControlName="minutesAvailForGroupsPhase" />
                </div>
                <div class="grid gap-2">
                  <label hlmLabel for="finalistCount">Anzahl Finalisten</label>
                  <input hlmInput id="finalistCount" type="number" formControlName="finalistCount" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div class="grid gap-2">
                  <label hlmLabel for="adminPassword">Neues Admin Passwort (optional)</label>
                  <input hlmInput id="adminPassword" type="password" formControlName="adminPassword" placeholder="Leer lassen für keine Änderung" />
                </div>
                <div class="grid gap-2">
                  <label hlmLabel for="refereePassword">Neues Referee Passwort (optional)</label>
                  <input hlmInput id="refereePassword" type="password" formControlName="refereePassword" />
                </div>
              </div>

              <div class="flex justify-end">
                <button hlmBtn [disabled]="detailsForm.invalid || loading()">Speichern</button>
              </div>
            </form>
          </section>
        </div>

        <!-- Competitors Management -->
        <div hlmTabsContent="competitors" class="mt-6 space-y-6">
          <section hlmCard>
            <header hlmCardHeader>
              <h2 hlmCardTitle>Teilnehmer hinzufügen</h2>
            </header>
            <div hlmCardContent class="flex gap-4">
              <div class="flex-1">
                <input hlmInput placeholder="Name des Teams/Teilnehmers" #newName />
              </div>
              <button hlmBtn (click)="addCompetitor(newName.value); newName.value = ''" [disabled]="loading()">Hinzufügen</button>
            </div>
          </section>

          <section hlmCard>
            <div hlmCardContent class="p-0">
              <div hlmTableContainer>
                <table hlmTable>
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh class="w-16">ID</th>
                      <th hlmTh>Name</th>
                      <th hlmTh class="w-24 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @if (competitorsResource.isLoading()) {
                      <tr hlmTr>
                        <td hlmTd colspan="3" class="text-center py-8">Lade Teilnehmer...</td>
                      </tr>
                    } @else {
                      @for (c of competitors(); track c.id) {
                        <tr hlmTr>
                          <td hlmTd class="w-16 text-muted-foreground font-mono">{{ c.id }}</td>
                          <td hlmTd class="font-medium">{{ c.name }}</td>
                          <td hlmTd class="w-24 text-right">
                            <button hlmBtn variant="ghost" size="sm" class="text-destructive hover:text-destructive" (click)="deleteCompetitor(c.id)">Löschen</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr hlmTr>
                          <td hlmTd colspan="3" class="text-center py-8 text-muted-foreground italic text-lg">Keine Teilnehmer gefunden.</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <!-- Strategic Actions -->
        <div hlmTabsContent="actions" class="mt-6">
          <section hlmCard>
            <header hlmCardHeader>
              <h2 hlmCardTitle>Turnier-Operationen</h2>
              <p hlmCardDescription>Gefährliche Aktionen. Hier werden Spielpläne generiert oder zurückgesetzt.</p>
            </header>
            <div hlmCardContent class="grid gap-6">
              <div class="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <h3 class="font-bold">1. Losziehung</h3>
                  <p class="text-sm text-muted-foreground">Verteilt alle Teilnehmer zufällig auf Gruppen.</p>
                </div>
                <button hlmBtn variant="outline" (click)="action('random-draw')" [disabled]="loading()">Losziehen</button>
              </div>

              <div class="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <h3 class="font-bold">2. Turnier berechnen</h3>
                  <p class="text-sm text-destructive">Löscht alle bestehenden Spiele und Ergebnisse!</p>
                </div>
                <button hlmBtn variant="destructive" (click)="action('calc-tournament')" [disabled]="loading()">Neu Berechnen</button>
              </div>

              <div class="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <h3 class="font-bold">3. Finals generieren</h3>
                  <p class="text-sm text-muted-foreground">Erstellt das KO-Bracket basierend auf dem Gruppenranking.</p>
                </div>
                <button hlmBtn variant="outline" (click)="action('calc-finals')" [disabled]="loading()">Finals erstellen</button>
              </div>

              <div class="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <h3 class="font-bold">4. Nächste Finalrunde</h3>
                  <p class="text-sm text-muted-foreground">Berechnet die nächste Phase (z.B. nach Halbfinale das Finale).</p>
                </div>
                <button hlmBtn variant="outline" (click)="action('calc-next-final-round')" [disabled]="loading()">Weiterführen</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
})
export default class AdminPage {
  private fb = ngInject(FormBuilder);
  private http = ngInject(HttpClient);
  initialData = toSignal(injectLoad<typeof load>());
  
  loading = signal(false);

  competitorsResource = resource({
    loader: () => firstValueFrom(this.http.get<any[]>('/api/competitors')),
  });

  competitors = computed(() => this.competitorsResource.value() ?? []);

  detailsForm = this.fb.group({
    name: ['', Validators.required],
    numberOfParallelGames: [2, [Validators.required, Validators.min(1)]],
    minutesPerGame: [15, [Validators.required, Validators.min(1)]],
    minutesAvailForGroupsPhase: [120, [Validators.required, Validators.min(1)]],
    finalistCount: [4, [Validators.required, Validators.min(2)]],
    tournamentStartTime: ['', Validators.required],
    finalsStartTime: ['', Validators.required],
    adminPassword: [''],
    refereePassword: [''],
  });

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data?.tournament) {
        this.detailsForm.patchValue({
          ...data.tournament,
          tournamentStartTime: new Date(data.tournament.tournamentStartTime).toISOString().slice(0, 16),
          finalsStartTime: new Date(data.tournament.finalsStartTime).toISOString().slice(0, 16),
          adminPassword: '',
          refereePassword: '',
        });
      }
    });
  }

  async updateDetails() {
    if (this.detailsForm.invalid) return;
    this.loading.set(true);
    try {
      await firstValueFrom(this.http.put('/api/tournament', this.detailsForm.value));
      alert('Einstellungen gespeichert.');
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      this.loading.set(false);
    }
  }

  async addCompetitor(name: string) {
    if (!name) return;
    this.loading.set(true);
    try {
      await firstValueFrom(this.http.post<any>('/api/competitors', { name }));
      this.competitorsResource.reload();
    } catch (err) {
      console.error('Add failed', err);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteCompetitor(id: number) {
    if (!confirm('Teilnehmer wirklich löschen?')) return;
    this.loading.set(true);
    try {
      await firstValueFrom(this.http.delete(`/api/competitors/${id}`));
      this.competitorsResource.reload();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      this.loading.set(false);
    }
  }

  async action(type: string) {
    if (type === 'calc-tournament' && !confirm('Dies löscht ALLE Spiele und Ergebnisse. Wirklich fortfahren?')) return;
    
    this.loading.set(true);
    try {
      let url = `/api/actions/${type}`;
      if (type === 'random-draw') url = '/api/competitors/random-draw';
      
      await firstValueFrom(this.http.post(url, {}));
      alert('Aktion erfolgreich ausgeführt.');
      this.competitorsResource.reload();
    } catch (err) {
      console.error('Action failed', err);
      alert('Fehler bei der Aktion.');
    } finally {
      this.loading.set(false);
    }
  }
}
