import { ErrorHandler, Injectable, Injector, NgZone, inject } from '@angular/core';
import { GlobalErrorService } from '../services/global-error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private injector = inject(Injector);
  private zone = inject(NgZone);

  handleError(error: unknown) {
    this.zone.run(() => {
      try {
        const service = this.injector.get(GlobalErrorService);
        service.handleError(error);
      } catch (e) {
        console.error('Error handling failed', e);
      }
      console.error('CRITICAL ERROR :', error);
    });
  }
}
