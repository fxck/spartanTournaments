import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { injectLoad, defineRouteMeta } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { refereeGuard } from '../../../auth.guard';
import { isGroups } from 'calc-tournament';
import type { load } from './[id].server';

export const routeMeta = defineRouteMeta({
  canActivate: [refereeGuard],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-referee-score-entry',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HlmButton, HlmInput, HlmLabel],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <a
        [routerLink]="returnUrl"
        class="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Zurück zur Übersicht
      </a>

      @if (pairing(); as p) {
        <div class="border rounded-2xl shadow-lg bg-card overflow-hidden">
          <!-- Card Header with match details -->
          <div class="bg-muted/40 border-b px-8 py-6 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span class="text-xs font-semibold text-primary uppercase tracking-wider">Ergebnis eintragen</span>
              <h2 class="text-2xl font-bold tracking-tight mt-0.5">
                @if (p.gamenumber > 0) {
                  Spiel Nr. {{ p.gamenumber }}
                } @else {
                  Spiel
                }
              </h2>
            </div>
            <div class="flex gap-2">
              <span class="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm"
                >Court {{ p.court }}</span
              >
              @if (isGroups(p)) {
                <span class="px-3 py-1.5 bg-muted text-muted-foreground font-semibold rounded-lg text-sm"
                  >Runde {{ p.round }}</span
                >
              }
            </div>
          </div>

          <!-- Score Input Form -->
          <form [formGroup]="resultForm" (ngSubmit)="saveResult()" class="p-8 space-y-8">
            <div class="grid grid-cols-2 gap-8 md:gap-12 relative">
              <!-- Competitor 1 -->
              <div class="space-y-4 text-center">
                <label
                  hlmLabel
                  for="competitor1Points"
                  class="text-lg font-semibold block truncate"
                  title="{{ p.competitor1?.name }}"
                  >{{ p.competitor1?.name }}</label
                >
                <input
                  hlmInput
                  id="competitor1Points"
                  type="number"
                  (focus)="selectText($event)"
                  formControlName="competitor1Points"
                  class="text-center text-4xl font-extrabold h-24 w-full shadow-inner border-2 focus:border-primary transition-all rounded-xl"
                />
              </div>

              <!-- VS Badge -->
              <div
                class="absolute left-1/2 bottom-12 -translate-x-1/2 translate-y-1/2 bg-muted border font-bold text-xs px-2.5 py-1 rounded-full text-muted-foreground shadow-sm uppercase"
              >
                VS
              </div>

              <!-- Competitor 2 -->
              <div class="space-y-4 text-center">
                <label
                  hlmLabel
                  for="competitor2Points"
                  class="text-lg font-semibold block truncate"
                  title="{{ p.competitor2?.name }}"
                  >{{ p.competitor2?.name }}</label
                >
                <input
                  hlmInput
                  id="competitor2Points"
                  type="number"
                  (focus)="selectText($event)"
                  formControlName="competitor2Points"
                  class="text-center text-4xl font-extrabold h-24 w-full shadow-inner border-2 focus:border-primary transition-all rounded-xl"
                />
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex justify-end gap-3 pt-6 border-t">
              @if (gamepoint() && isAdmin()) {
                <button
                  type="button"
                  hlmBtn
                  variant="destructive"
                  [disabled]="loading()"
                  (click)="deleteResult()"
                  class="w-36 mr-auto"
                >
                  Ergebnis löschen
                </button>
              }
              <a hlmBtn variant="ghost" [routerLink]="returnUrl" class="w-28">Abbrechen</a>
              <button hlmBtn [disabled]="resultForm.invalid || loading()" class="w-36 gap-2">
                @if (loading()) {
                  <span
                    class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  ></span>
                }
                Speichern
              </button>
            </div>
          </form>
        </div>
      } @else {
        <div class="text-center py-20 border-2 border-dashed rounded-2xl bg-card">
          <h2 class="text-2xl font-bold">Spiel nicht gefunden</h2>
          <p class="text-muted-foreground mt-2">
            Das gesuchte Spiel existiert nicht oder Sie haben eine ungültige ID aufgerufen.
          </p>
          <a hlmBtn class="mt-6" [routerLink]="returnUrl">Zurück zur Übersicht</a>
        </div>
      }
    </div>
  `,
})
export default class RefereeScoreEntryPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Where to return after saving/cancelling — '/results' if we came from there, else '/referee'.
  protected returnUrl = this.route.snapshot.queryParamMap.get('from') === 'results' ? '/results' : '/referee';

  protected isGroups = isGroups;

  data = toSignal(injectLoad<typeof load>());
  pairing = computed(() => this.data()?.pairing ?? null);
  gamepoint = computed(() => this.data()?.gamepoint ?? null);
  isAdmin = computed(() => this.data()?.role === 'admin');

  loading = signal(false);

  resultForm = this.fb.group({
    competitor1Points: [0, [Validators.required, Validators.min(0)]],
    competitor2Points: [0, [Validators.required, Validators.min(0)]],
  });

  selectText(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.select();
    }
  }

  constructor() {
    effect(() => {
      const gp = this.gamepoint();
      if (gp) {
        this.resultForm.patchValue({
          competitor1Points: gp.competitor1Points ?? 0,
          competitor2Points: gp.competitor2Points ?? 0,
        });
      }
    });
  }

  async saveResult() {
    const p = this.pairing();
    if (!p || this.resultForm.invalid) return;

    this.loading.set(true);
    try {
      const payload = {
        competitor1Points: this.resultForm.value.competitor1Points ?? 0,
        competitor2Points: this.resultForm.value.competitor2Points ?? 0,
        pairingID: p.id,
      };

      await firstValueFrom(this.http.post('/api/gamepoints', payload));

      // Navigate back to wherever we came from upon success
      this.router.navigateByUrl(this.returnUrl);
    } catch (err) {
      console.error('Failed to save score', err);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteResult() {
    const p = this.pairing();
    if (!p) return;

    this.loading.set(true);
    try {
      await firstValueFrom(this.http.delete(`/api/gamepoints/${p.id}`));

      // Navigate back to wherever we came from upon success
      this.router.navigateByUrl(this.returnUrl);
    } catch (err) {
      console.error('Failed to delete score', err);
    } finally {
      this.loading.set(false);
    }
  }
}
