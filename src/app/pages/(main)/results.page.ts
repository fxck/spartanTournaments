import { Component, inject, signal, computed, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './results.server';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ...HlmTableImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    HlmButton,
    HlmInput,
    HlmLabel,
  ],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Ergebnisse</h1>
        <p class="text-muted-foreground mt-2">Alle abgeschlossenen und laufenden Spiele.</p>
      </header>

      <div hlmTableContainer class="border rounded-lg overflow-hidden shadow-sm">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh class="w-16">Nr.</th>
              <th hlmTh>Begegnung</th>
              <th hlmTh class="w-24 text-center border-l">Ergebnis</th>
              @if (canEdit()) {
                <th hlmTh class="w-24 text-right">Aktion</th>
              }
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (p of results(); track p.id) {
              <tr hlmTr>
                <td hlmTd class="w-16 text-muted-foreground font-mono">{{ p.gamenumber }}</td>
                <td hlmTd>
                  <div class="flex items-center gap-4">
                    <a [routerLink]="['/competitor', p.competitor1.id]" 
                       class="flex-1 text-right hover:underline hover:text-primary transition-colors"
                       [class.font-bold]="p.points?.competitor1Points > p.points?.competitor2Points">
                      {{ p.competitor1.name }}
                    </a>
                    <span class="text-muted-foreground/50 text-xs font-bold italic">VS</span>
                    <a [routerLink]="['/competitor', p.competitor2.id]" 
                       class="flex-1 hover:underline hover:text-primary transition-colors"
                       [class.font-bold]="p.points?.competitor2Points > p.points?.competitor1Points">
                      {{ p.competitor2.name }}
                    </a>
                  </div>
                </td>
                <td hlmTd class="w-24 text-center font-black text-xl border-l bg-muted/20">
                  @if (p.points) {
                    {{ p.points.competitor1Points }}:{{ p.points.competitor2Points }}
                  } @else {
                    <span class="text-muted-foreground/30 font-normal">-:-</span>
                  }
                </td>
                @if (canEdit()) {
                  <td hlmTd class="w-24 text-right">
                    <button hlmBtn variant="ghost" size="sm" (click)="openEdit(p)">
                      {{ p.points ? 'Edit' : 'Eintragen' }}
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr hlmTr>
                <td hlmTd colspan="4" class="text-center py-24 text-muted-foreground italic">Noch keine Spiele geplant.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <brn-dialog #dialog [closeDelay]="100">
      <hlm-dialog-content class="sm:max-w-[425px]" *brnDialogContent="let ctx">
        @if (editingPairing(); as p) {
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Ergebnis eintragen</h3>
            <p hlmDialogDescription>Spiel Nr. {{ p.gamenumber }} auf Court {{ p.court }}</p>
          </hlm-dialog-header>
          
          <form [formGroup]="resultForm" (ngSubmit)="saveResult(ctx)" class="grid gap-6 py-4">
            <div class="grid grid-cols-2 gap-8 items-center">
              <div class="space-y-2 text-center">
                <label hlmLabel>{{ p.competitor1.name }}</label>
                <input hlmInput type="number" formControlName="competitor1Points" class="text-center text-3xl h-20" />
              </div>
              <div class="space-y-2 text-center">
                <label hlmLabel>{{ p.competitor2.name }}</label>
                <input hlmInput type="number" formControlName="competitor2Points" class="text-center text-3xl h-20" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <button hlmBtn variant="ghost" type="button" (click)="ctx.close()">Abbrechen</button>
              <button hlmBtn [disabled]="resultForm.invalid || loading()">Speichern</button>
            </div>
          </form>
        }
      </hlm-dialog-content>
    </brn-dialog>
  `,
})
export default class ResultsPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialog = viewChild<BrnDialog>('dialog');
  
  data = toSignal(injectLoad<typeof load>());
  
  pairings = computed(() => this.data()?.pairings ?? []);
  gamepoints = computed(() => this.data()?.gamepoints ?? []);
  role = computed(() => this.data()?.role ?? null);
  
  loading = signal(false);
  editingPairing = signal<any | null>(null);

  resultForm = this.fb.group({
    competitor1Points: [0, [Validators.required, Validators.min(0)]],
    competitor2Points: [0, [Validators.required, Validators.min(0)]],
  });

  canEdit = computed(() => this.role() === 'admin' || this.role() === 'referee');

  results = computed(() => {
    const pairings = this.pairings();
    const gps = this.gamepoints();
    return pairings.map((p: any) => ({
      ...p,
      points: gps.find((g: any) => g.pairingID === p.id)
    }));
  });

  openEdit(p: any) {
    this.editingPairing.set(p);
    this.resultForm.patchValue({
      competitor1Points: p.points?.competitor1Points ?? 0,
      competitor2Points: p.points?.competitor2Points ?? 0,
    });
    this.dialog()?.open();
  }

  async saveResult(ctx: any) {
    const p = this.editingPairing();
    if (!p || this.resultForm.invalid) return;
    
    this.loading.set(true);
    try {
      const payload = {
        ...this.resultForm.value,
        pairingID: p.id
      };
      await firstValueFrom(this.http.post<any>('/api/gamepoints', payload));
      // In this setup, we might need a way to refresh the data since injectLoad won't re-run automatically.
      // But for now, we follow the requested refactoring.
      ctx.close();
      this.editingPairing.set(null);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      this.loading.set(false);
    }
  }
}
