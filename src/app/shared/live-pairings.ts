import { computed, inject, resource, DestroyRef, PLATFORM_ID, type Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Wire up a self-refreshing view of a pairings endpoint.
 *
 * Returns a signal that yields the SSR payload first (via the page's
 * `injectLoad()` signal) and then, in the browser, the latest value polled
 * from `apiUrl` every `intervalMs`. Must be called from an injection context
 * (a component field initializer).
 *
 * Only fetches in the browser: on the server the relative URL has no host, and
 * the SSR render already has its data. The loader returns undefined there, so
 * the computed falls back to `ssrData` during SSR.
 */
export function injectLivePairings<T>(apiUrl: string, ssrData: Signal<T>, intervalMs = 30_000): Signal<T> {
  const http = inject(HttpClient);
  const platformId = inject(PLATFORM_ID);
  const destroyRef = inject(DestroyRef);

  const live = resource({
    loader: () => (isPlatformBrowser(platformId) ? firstValueFrom(http.get<T>(apiUrl)) : Promise.resolve(undefined)),
  });

  if (isPlatformBrowser(platformId)) {
    const intervalId = setInterval(() => live.reload(), intervalMs);
    destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  return computed(() => live.value() ?? ssrData());
}
