import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export const setupGuard = async (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const http = inject(HttpClient);
  const router = inject(Router);

  try {
    const res = await firstValueFrom(http.get<{ tournament?: unknown }>('/api/tournament'));
    const tournament = res?.tournament;
    // Compare against the navigation TARGET, not router.url (the committed URL).
    // During canActivate the target hasn't committed yet, so router.url still
    // points at the previous page — using it causes a redirect loop.
    const target = state.url.split('?')[0];
    if (!tournament && target !== '/setup') {
      return router.parseUrl('/setup');
    }
    if (tournament && target === '/setup') {
      return router.parseUrl('/');
    }
    return true;
  } catch {
    return true;
  }
};
