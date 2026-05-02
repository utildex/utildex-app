import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading, NoPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { SynedexAppComponent } from './src/app.component.synedex';
import { routes } from './src/app.routes.synedex';
import { GlobalErrorHandler } from './src/core/global-error-handler';
import { TOUR_STEPS, DEFAULT_TOUR_STEPS } from './src/core/tour.config';

bootstrapApplication(SynedexAppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withPreloading(NoPreloading)),
    provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    { provide: TOUR_STEPS, useValue: DEFAULT_TOUR_STEPS },
  ],
}).catch((err) => console.error(err));
