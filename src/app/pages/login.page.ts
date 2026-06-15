import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, HlmButton, HlmInput, HlmLabel, ...HlmCardImports],
  template: `
    <div class="flex justify-center items-center min-h-screen p-4 bg-muted/40">
      <section hlmCard class="w-full max-w-sm">
        <header hlmCardHeader>
          <h1 hlmCardTitle>Login</h1>
          <p hlmCardDescription>Gib dein Passwort ein, um dich als Admin oder Referee anzumelden.</p>
        </header>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" hlmCardContent class="grid gap-4">
          <div class="grid gap-2">
            <label hlmLabel for="password">Passwort</label>
            <input hlmInput id="password" type="password" formControlName="password" placeholder="••••••••" />
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <button hlmBtn [disabled]="loginForm.invalid || loading()">
              {{ loading() ? 'Wird angemeldet...' : 'Anmelden' }}
            </button>
            <button hlmBtn variant="ghost" type="button" (click)="goBack()">Abbrechen</button>
          </div>

          @if (error()) {
            <p class="text-destructive text-sm text-center mt-2">{{ error() }}</p>
          }
        </form>
      </section>
    </div>
  `,
})
export default class LoginPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  loginForm = this.fb.group({
    password: ['', [Validators.required]],
  });

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await lastValueFrom(this.http.post<{ role: string }>('/api/auth/login', this.loginForm.value));
      if (res.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/']);
      }
    } catch (err) {
      console.error('Login failed', err);
      this.error.set('Ungültiges Passwort oder Serverfehler.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
