import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformServer } from '@angular/common';
import { REQUEST } from '@analogjs/router/tokens';

export const adminGuard = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isServer = isPlatformServer(platformId);

  try {
    const res = await firstValueFrom(http.get<{ role: string }>('/api/auth/session'));
    if (res.role === 'admin') {
      return true;
    }
    console.log(`[GUARD] Admin access denied. Role: ${res.role} (Server: ${isServer})`);
    return router.parseUrl('/login');
  } catch (err: any) {
    console.error(`[GUARD] Admin check failed: ${err.message} (Server: ${isServer})`);
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
