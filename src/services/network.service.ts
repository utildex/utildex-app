import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  isOnline = signal<boolean>(navigator.onLine);

  private onlineHandler = () => this.isOnline.set(true);
  private offlineHandler = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}