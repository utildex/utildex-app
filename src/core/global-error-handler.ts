import { ErrorHandler, Injectable, Injector, NgZone, inject } from '@angular/core';
import { GlobalErrorService } from '../services/global-error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private injector = inject(Injector);
  private zone = inject(NgZone);

  handleError(error: unknown) {
    // Run inside zone to ensure change detection updates the UI (Error Overlay)
    this.zone.run(() => {
      try {
        const service = this.injector.get(GlobalErrorService);
        service.handleError(error);
      } catch (e) {
        console.error('Error handling failed', e);
      }
      // Always log to console for dev visibility
      console.error('🔥 CRITICAL ERROR:', error);
    });
  }
}