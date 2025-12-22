import { Injectable, inject, WritableSignal, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);

  /**
   * Syncs a signal with LocalStorage.
   * - Reads on init.
   * - Writes on change.
   */
  storage<T>(targetSignal: WritableSignal<T>, key: string, type: 'string' | 'number' | 'boolean' = 'string') {
    const fullKey = `utildex-state-${key}`;
    
    // 1. Restore from Storage
    const stored = localStorage.getItem(fullKey);
    if (stored !== null) {
      if (type === 'number') targetSignal.set(Number(stored) as T);
      else if (type === 'boolean') targetSignal.set((stored === 'true') as T);
      else targetSignal.set(stored as T);
    }

    // 2. Watch for changes
    effect(() => {
      const val = targetSignal();
      localStorage.setItem(fullKey, String(val));
    });
  }

  /**
   * Syncs a signal with URL Query Parameters.
   * - Reads from current route query params on init.
   * - Updates URL on change (without reloading).
   */
  url<T>(targetSignal: WritableSignal<T>, paramName: string, type: 'string' | 'number' | 'boolean' = 'string') {
    // 1. Restore from URL
    const params = this.route.snapshot.queryParams;
    const val = params[paramName];
    
    if (val !== undefined) {
      if (type === 'number' && !isNaN(Number(val))) targetSignal.set(Number(val) as T);
      else if (type === 'boolean') targetSignal.set((val === 'true') as T);
      else if (type === 'string') targetSignal.set(val as T);
    }

    // 2. Watch for changes and update URL
    // We use a debounce/timeout to prevent flooding history if the signal changes rapidly (e.g. typing)
    let timeout: any;

    effect(() => {
      const newVal = targetSignal();
      
      // Avoid circular update if signal matches current URL param
      const currentParams = this.router.parseUrl(this.router.url).queryParams;
      if (String(currentParams[paramName]) === String(newVal)) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [paramName]: newVal },
          queryParamsHandling: 'merge', // Keep other params
          replaceUrl: true // Don't create history entry for every keystroke
        });
      }, 300);
    });
  }
}