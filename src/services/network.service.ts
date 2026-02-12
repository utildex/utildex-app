
import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Arrow function to preserve 'this' context when passed as callback
  private updateStatus = () => {
    if (typeof navigator !== 'undefined') {
      // Check if value actually changed to avoid unnecessary signal updates
      if (this.isOnline() !== navigator.onLine) {
        this.isOnline.set(navigator.onLine);
      }
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.updateStatus);
      window.addEventListener('offline', this.updateStatus);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.updateStatus);
      window.removeEventListener('offline', this.updateStatus);
    }
  }
}
