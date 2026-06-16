import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export const adminGuard = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  try {
    const res = await firstValueFrom(http.get<{ role: string }>('/api/auth/session'));
    if (res.role === 'admin') {
      return true;
    }
    return router.parseUrl('/login');
  } catch {
    return router.parseUrl('/login');
  }
};

export const refereeGuard = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  try {
    const res = await firstValueFrom(http.get<{ role: string }>('/api/auth/session'));
    if (res.role === 'admin' || res.role === 'referee') {
      return true;
    }
    return router.parseUrl('/login');
  } catch {
    return router.parseUrl('/login');
  }
};
