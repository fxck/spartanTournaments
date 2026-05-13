import {  Component, inject , ChangeDetectionStrategy } from '@angular/core';
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
              <label hlmLabel for="adminPassword">Admin Passwort</label>
              <input hlmInput id="adminPassword" type="password" formControlName="adminPassword" />
            </div>
            <div class="grid gap-2">
              <label hlmLabel for="refereePassword">Referee Passwort</label>
              <input hlmInput id="refereePassword" type="password" formControlName="refereePassword" />
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button hlmBtn [disabled]="setupForm.invalid || loading">
              {{ loading ? 'Wird gespeichert...' : 'Turnier anlegen' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export default class SetupPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  
  data = toSignal(injectLoad<typeof load>());
  loading = false;

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
    this.loading = true;
    try {
      await lastValueFrom(this.http.post('/api/tournament/setup', this.setupForm.value));
      this.router.navigate(['/admin']);
    } catch (err) {
      console.error('Setup failed', err);
      alert('Setup fehlgeschlagen. Bitte prüfe die Eingaben.');
    } finally {
      this.loading = false;
    }
  }
}
