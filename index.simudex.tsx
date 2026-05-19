import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection, isDevMode, ErrorHandler } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  NoPreloading,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { SimudexAppComponent } from './src/app.component.simudex';
import { routes } from './src/app.routes.simudex';
import { GlobalErrorHandler } from './src/core/global-error-handler';
import { TOUR_STEPS } from './src/core/tour.config';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isLocalhost && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        const scriptUrls = [
          registration.active?.scriptURL,
          registration.waiting?.scriptURL,
          registration.installing?.scriptURL,
        ];
        if (scriptUrls.some((url) => url?.includes('ngsw-worker.js'))) {
          void registration.unregister();
        }
      }
    })
    .catch(() => undefined);
}

bootstrapApplication(SimudexAppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withPreloading(NoPreloading)),
    provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !isLocalhost,
      registrationStrategy: 'registerImmediately',
    }),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    { provide: TOUR_STEPS, useValue: [] },
  ],
}).catch((err) => console.error(err));
