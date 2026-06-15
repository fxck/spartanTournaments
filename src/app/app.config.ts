import { provideHttpClient, withFetch, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { REQUEST } from '@analogjs/router/tokens';

const cookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isServer = isPlatformServer(platformId);

  if (isServer) {
    const request = inject(REQUEST, { optional: true }) as {
      headers?: Headers | Record<string, string | undefined>;
    } | null;
    // In H3/Analog, the request object headers can be accessed differently.
    // Try both standard Request API and raw object mapping.
    const headers = request?.headers;
    const cookies = headers instanceof Headers ? headers.get('cookie') : headers?.['cookie'] || headers?.['Cookie'];

    if (cookies) {
      req = req.clone({
        setHeaders: {
          cookie: cookies,
        },
      });
    }
  }

  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(),
    provideHttpClient(withFetch(), withInterceptors([cookieInterceptor, requestContextInterceptor])),
    provideClientHydration(withEventReplay()),
  ],
};
