import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);
  private checkIntervalMs = 10 * 60 * 1000;

  isUpdateAvailable = signal(false);
  isUpdating = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled || typeof window === 'undefined') {
      return;
    }

    this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        this.isUpdateAvailable.set(true);
      }

      if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.warn('[SW] Version installation failed', event.error);
      }
    });

    void this.checkForUpdate();

    window.addEventListener('online', () => {
      void this.checkForUpdate();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdate();
      }
    });

    window.setInterval(() => {
      void this.checkForUpdate();
    }, this.checkIntervalMs);
  }

  async applyUpdateAndReload() {
    if (!this.swUpdate.isEnabled || this.isUpdating()) {
      return;
    }

    this.isUpdating.set(true);

    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } catch (error) {
      console.error('[SW] Failed to activate update', error);
      this.isUpdating.set(false);
    }
  }

  private async checkForUpdate() {
    if (!this.swUpdate.isEnabled || typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }

    try {
      await this.swUpdate.checkForUpdate();
    } catch (error) {
      console.warn('[SW] Update check failed', error);
    }
  }
}
