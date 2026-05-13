import {  Component, inject, signal, effect, computed , ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HlmButton } from '@spartan-ng/helm/button';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive, HlmButton],
  template: `
    <nav class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-8">
            <a routerLink="/" class="text-xl font-bold tracking-tight">spartanTournaments</a>
            
            <div class="hidden md:flex items-center gap-4">
              <a routerLink="/" routerLinkActive="text-primary" [routerLinkActiveOptions]="{exact: true}" class="text-sm font-medium transition-colors hover:text-primary">Home</a>
              <a routerLink="/gameplan" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Spielplan</a>
              <a routerLink="/groups" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Gruppen</a>
              <a routerLink="/results" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Ergebnisse</a>
            </div>
          </div>

          <div class="flex items-center gap-4">
            @if (role() === 'admin') {
              <a hlmBtn variant="outline" size="sm" routerLink="/admin">Admin</a>
            }
            
            @if (role()) {
              <button hlmBtn variant="ghost" size="sm" (click)="logout()">Logout</button>
            } @else {
              <a hlmBtn variant="ghost" size="sm" routerLink="/login">Login</a>
            }
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  private http = inject(HttpClient);
  
  private _session = toSignal(this.http.get<{ role: 'admin' | 'referee' | null }>('/api/auth/session'));
  role = computed(() => this._session()?.role ?? null);

  async logout() {
    try {
      await this.http.post('/api/auth/logout', {}).toPromise();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  }
}
