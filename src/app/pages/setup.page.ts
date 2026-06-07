import { Component, inject, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { injectLoad } from '@analogjs/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './setup.server';
import { SimpleDialogService } from '../shared/simple-dialog/simple-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-setup',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    ...HlmCardImports,
  ],
  template: `
    <div class="flex justify-center items-center min-h-screen p-4 bg-muted/40">
      <section hlmCard class="w-full max-w-2xl">
        <header hlmCardHeader>
          <h1 hlmCardTitle>Turnier Setup</h1>
          <p hlmCardDescription>Initialisiere dein Boccia-Turnier. Diese Seite ist nur einmalig erreichbar.</p>
        </header>
        
        <form [formGroup]="setupForm" (ngSubmit)="onSubmit()" hlmCardContent class="grid gap-6">
          <div class="grid gap-2">
            <label hlmLabel for="name">Turnier Name</label>
            <input hlmInput id="name" formControlName="name" placeholder="z.B. Spartan 4Kids 2026" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <label hlmLabel for="numberOfParallelGames">Anzahl paralleler Spiele</label>
              <input hlmInput type="number" id="numberOfParallelGames" formControlName="numberOfParallelGames" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="minutesPerGame">Dauer pro Spiel (Minuten)</label>
              <input hlmInput type="number" id="minutesPerGame" formControlName="minutesPerGame" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="minutesAvailForGroupsPhase">Verfügbare Zeit Gruppenphase (Minuten)</label>
              <input hlmInput type="number" id="minutesAvailForGroupsPhase" formControlName="minutesAvailForGroupsPhase" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="finalistCount">Anzahl Finalisten</label>
              <input hlmInput type="number" id="finalistCount" formControlName="finalistCount" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="tournamentStartTime">Turnier Startzeit</label>
              <input hlmInput type="datetime-local" id="tournamentStartTime" formControlName="tournamentStartTime" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="finalsStartTime">Finalspiele Startzeit</label>
              <input hlmInput type="datetime-local" id="finalsStartTime" formControlName="finalsStartTime" />
            </div>
          </div>

          <hr class="border-border" />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <label hlmLabel for="adminPassword">Admin Passwort</label>
              <input hlmInput type="password" id="adminPassword" formControlName="adminPassword" />
            </div>

            <div class="grid gap-2">
              <label hlmLabel for="refereePassword">Schiedsrichter Passwort</label>
              <input hlmInput type="password" id="refereePassword" formControlName="refereePassword" />
            </div>
          </div>

          <button hlmBtn type="submit" [disabled]="loading() || setupForm.invalid">
            @if (loading()) {
              Lädt...
            } @else {
              Turnier anlegen
            }
          </button>
        </form>
      </section>
    </div>
  `,
})
export default class SetupPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialogService = inject(SimpleDialogService);
  
  data = toSignal(injectLoad<typeof load>());
  loading = signal(false);

  setupForm = this.fb.group({
    name: ['', Validators.required],
    numberOfParallelGames: [2, [Validators.required, Validators.min(1)]],
    minutesPerGame: [15, [Validators.required, Validators.min(1)]],
    minutesAvailForGroupsPhase: [120, [Validators.required, Validators.min(1)]],
    finalistCount: [4, [Validators.required, Validators.min(2)]],
    tournamentStartTime: ['', Validators.required],
    finalsStartTime: ['', Validators.required],
    adminPassword: ['', [Validators.required, Validators.minLength(4)]],
    refereePassword: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor() {
    // If tournament already exists, redirect to home
    effect(() => {
      const tournamentData = this.data();
      if (tournamentData && tournamentData.tournament) {
        this.router.navigate(['/']);
      }
    });
  }

  async onSubmit() {
    if (this.setupForm.invalid) return;
    this.loading.set(true);
    try {
      const payload = {
        ...this.setupForm.value,
        // datetime-local is local wall-clock; convert to a true instant in the
        // browser (= venue) timezone so storage is correct on any server.
        tournamentStartTime: new Date(this.setupForm.value.tournamentStartTime!).toISOString(),
        finalsStartTime: new Date(this.setupForm.value.finalsStartTime!).toISOString(),
      };
      await lastValueFrom(this.http.post('/api/tournament/setup', payload));
      this.router.navigate(['/admin']);
    } catch (err) {
      console.error('Setup failed', err);
      await this.dialogService.alert('Setup fehlgeschlagen', 'Bitte prüfe die Eingaben.', 'error');
    } finally {
      this.loading.set(false);
    }
  }
}
