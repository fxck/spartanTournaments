import { Component as NgComponent, inject as ngInject, signal, effect, computed, resource, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
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
import { SimpleDialogService } from '../../shared/simple-dialog/simple-dialog.service';

export const routeMeta = defineRouteMeta({
  canActivate: [adminGuard],
});

@NgComponent({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
                  <label hlmLabel for="numberOfParallelGames">Parallele Spiele (Courts)</label>
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

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label hlmLabel for="tournamentStartTime">Turnier Startzeit</label>
                  <input hlmInput id="tournamentStartTime" type="datetime-local" formControlName="tournamentStartTime" />
                </div>
                <div class="grid gap-2">
                  <label hlmLabel for="finalsStartTime">Finals Startzeit</label>
                  <input hlmInput id="finalsStartTime" type="datetime-local" formControlName="finalsStartTime" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div class="grid gap-2">
                  <label hlmLabel for="adminPassword">Neues Admin Passwort</label>
                  <input hlmInput id="adminPassword" type="password" formControlName="adminPassword" placeholder="Unverändert lassen..." />
                </div>
                <div class="grid gap-2">
                  <label hlmLabel for="refereePassword">Neues Schiedsrichter Passwort</label>
                  <input hlmInput id="refereePassword" type="password" formControlName="refereePassword" placeholder="Unverändert lassen..." />
                </div>
              </div>

              <div class="flex justify-end pt-4">
                <button hlmBtn [disabled]="detailsForm.invalid || loading()">
                  {{ loading() ? 'Wird gespeichert...' : 'Einstellungen speichern' }}
                </button>
              </div>
            </form>
          </section>
        </div>

        <!-- Competitors List -->
        <div hlmTabsContent="competitors" class="mt-6">
          <section hlmCard>
            <header hlmCardHeader>
              <h2 hlmCardTitle>Teilnehmer</h2>
              <p hlmCardDescription>Füge neue Boccia-Spieler oder Teams hinzu und verwalte sie.</p>
            </header>
            
            <div hlmCardContent class="space-y-6">
              <form #addForm="ngForm" (ngSubmit)="addCompetitor(newCompetitorName.value); newCompetitorName.value = ''" class="flex gap-2">
                <div class="flex-1">
                  <input hlmInput #newCompetitorName placeholder="Name des Teilnehmers..." required />
                </div>
                <button hlmBtn [disabled]="loading()">Hinzufügen</button>
              </form>

              @if (competitors().length === 0) {
                <div class="text-center py-8 text-muted-foreground">
                  Keine Teilnehmer registriert.
                </div>
              } @else {
                <div hlmTableContainer>
                  <table hlmTable>
                    <thead hlmThead>
                      <tr hlmTr>
                        <th hlmTh class="w-16">ID</th>
                        <th hlmTh>Name</th>
                        <th hlmTh class="w-24 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody hlmTbody>
                      @for (c of competitors(); track c.id) {
                        <tr hlmTr>
                          <td hlmTd class="font-medium">{{ c.id }}</td>
                          <td hlmTd>{{ c.name }}</td>
                          <td hlmTd class="text-right">
                            <button hlmBtn variant="destructive" size="sm" (click)="deleteCompetitor(c.id)">Löschen</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Danger Zone Actions -->
        <div hlmTabsContent="actions" class="mt-6">
          <section hlmCard class="border-destructive/30">
            <header hlmCardHeader>
              <h2 hlmCardTitle class="text-destructive">Administrative Aktionen</h2>
              <p hlmCardDescription>Kritische Aktionen zur Generierung und Steuerung des Turniers.</p>
            </header>
            <div hlmCardContent class="grid gap-6">
              <div class="flex items-center justify-between p-4 border rounded-lg">
                <div class="space-y-1">
                  <h3 class="font-semibold">Auslosung</h3>
                  <p class="text-sm text-muted-foreground">Teilt alle registrierten Teilnehmer zufällig in Gruppen auf.</p>
                </div>
                <button hlmBtn variant="outline" [disabled]="loading()" (click)="action('random-draw')">Zufällige Auslosung</button>
              </div>

              <div class="flex items-center justify-between p-4 border rounded-lg">
                <div class="space-y-1">
                  <h3 class="font-semibold">Turnierspiele generieren</h3>
                  <p class="text-sm text-muted-foreground">Erstellt den Spielplan für die Gruppenphase basierend auf der Auslosung.</p>
                </div>
                <button hlmBtn variant="outline" [disabled]="loading()" (click)="action('calc-tournament')">Spiele generieren</button>
              </div>

              <div class="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                <div class="space-y-1">
                  <h3 class="font-semibold text-destructive">Gruppenphase beenden & Finals ausrechnen</h3>
                  <p class="text-sm text-muted-foreground">Berechnet die Tabellen und generiert den Final-Spielplan (Halbfinale, Finale etc.).</p>
                </div>
                <button hlmBtn variant="destructive" [disabled]="loading()" (click)="action('calc-finals')">Finalspiele berechnen</button>
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
  private dialogService = ngInject(SimpleDialogService);
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
      await this.dialogService.alert('Einstellungen', 'Einstellungen erfolgreich gespeichert.', 'success');
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
    if (!(await this.dialogService.confirm('Teilnehmer löschen', 'Möchtest du diesen Teilnehmer wirklich löschen?', true))) return;
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
    if (type === 'calc-tournament' && !(await this.dialogService.confirm('Spiele & Ergebnisse löschen', 'Dies löscht ALLE Spiele und Ergebnisse. Wirklich fortfahren?', true))) return;
    
    this.loading.set(true);
    try {
      let url = `/api/actions/${type}`;
      if (type === 'random-draw') url = '/api/competitors/random-draw';
      
      await firstValueFrom(this.http.post(url, {}));
      await this.dialogService.alert('Erfolg', 'Aktion erfolgreich ausgeführt.', 'success');
      this.competitorsResource.reload();
    } catch (err) {
      console.error('Action failed', err);
      await this.dialogService.alert('Fehler', 'Fehler bei der Aktion.', 'error');
    } finally {
      this.loading.set(false);
    }
  }
}
