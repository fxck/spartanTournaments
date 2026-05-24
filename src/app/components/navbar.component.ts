import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HlmButton } from '@spartan-ng/helm/button';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive, HlmButton],
  template: `
    <nav class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-8">
            <a routerLink="/" class="text-xl font-bold tracking-tight shrink-0">spartanTournaments</a>

            <!-- Desktop nav -->
            <div class="hidden md:flex items-center gap-4">
              <a routerLink="/" routerLinkActive="text-primary" [routerLinkActiveOptions]="{exact: true}" class="text-sm font-medium transition-colors hover:text-primary">Home</a>
              <a routerLink="/gameplan" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Spielplan</a>
              <a routerLink="/groups" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Gruppen</a>
              <a routerLink="/results" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Ergebnisse</a>
              @if (role() === 'admin' || role() === 'referee') {
                <a routerLink="/referee" routerLinkActive="text-primary" class="text-sm font-medium transition-colors hover:text-primary">Schiedsrichter</a>
              }
            </div>
          </div>

          <div class="flex items-center gap-2">
            @if (role() === 'admin') {
              <a hlmBtn variant="outline" size="sm" routerLink="/admin" class="hidden md:inline-flex">Admin</a>
            }
            @if (role()) {
              <button hlmBtn variant="ghost" size="sm" (click)="logout()" class="hidden md:inline-flex">Logout</button>
            } @else {
              <a hlmBtn variant="ghost" size="sm" routerLink="/login" class="hidden md:inline-flex">Login</a>
            }

            <!-- Mobile hamburger -->
            <button class="md:hidden p-2 rounded-md hover:bg-accent transition-colors" (click)="mobileOpen.set(!mobileOpen())">
              @if (mobileOpen()) {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              }
            </button>
          </div>
        </div>

        <!-- Mobile dropdown -->
        @if (mobileOpen()) {
          <div class="md:hidden border-t py-4 space-y-1" (click)="mobileOpen.set(false)">
            <a routerLink="/" routerLinkActive="bg-accent" [routerLinkActiveOptions]="{exact: true}" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Home</a>
            <a routerLink="/gameplan" routerLinkActive="bg-accent" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Spielplan</a>
            <a routerLink="/groups" routerLinkActive="bg-accent" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Gruppen</a>
            <a routerLink="/results" routerLinkActive="bg-accent" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Ergebnisse</a>
            @if (role() === 'admin' || role() === 'referee') {
              <a routerLink="/referee" routerLinkActive="bg-accent" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Schiedsrichter</a>
            }
            @if (role() === 'admin') {
              <a routerLink="/admin" routerLinkActive="bg-accent" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Admin</a>
            }
            <div class="pt-2 border-t mt-2">
              @if (role()) {
                <button class="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors" (click)="logout()">Logout</button>
              } @else {
                <a routerLink="/login" class="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Login</a>
              }
            </div>
          </div>
        }
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  private http = inject(HttpClient);

  private _session = toSignal(this.http.get<{ role: 'admin' | 'referee' | null }>('/api/auth/session'));
  role = computed(() => this._session()?.role ?? null);
  mobileOpen = signal(false);

  async logout() {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  }
}
