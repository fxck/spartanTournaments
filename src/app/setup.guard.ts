import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export const setupGuard = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  try {
    const res = await firstValueFrom(http.get<{ tournament?: unknown }>('/api/tournament'));
    const tournament = res?.tournament;
    if (!tournament && router.url !== '/setup') {
      return router.parseUrl('/setup');
    }
    if (tournament && router.url === '/setup') {
      return router.parseUrl('/');
    }
    return true;
  } catch {
    return true;
  }
};
