
import { Injectable, inject, WritableSignal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private router: Router = inject(Router);
  private db: DbService = inject(DbService);

  /**
   * Syncs a signal with IndexedDB (Async).
   * - Reads on init (async).
   * - Writes on change.
   */
  storage<T>(targetSignal: WritableSignal<T>, key: string, type: 'string' | 'number' | 'boolean' = 'string') {
    const fullKey = `utildex-state-${key}`;
    let isLoaded = false;

    // 1. Restore from DB
    this.db.get<string>(fullKey).then(stored => {
      if (stored !== undefined && stored !== null) {
        if (type === 'number') targetSignal.set(Number(stored) as T);
        else if (type === 'boolean') targetSignal.set((stored === 'true') as T);
        else targetSignal.set(stored as T);
      }
      isLoaded = true;
    });

    // 2. Watch for changes
    effect(() => {
      const val = targetSignal();
      // Only persist if we have finished loading, to avoid overwriting DB with default values
      if (isLoaded) {
        this.db.set(fullKey, String(val));
      }
    });
  }

  /**
   * Syncs a signal with URL Query Parameters.
   * Must be called within an Injection Context (e.g. Component Constructor).
   */
  url<T>(targetSignal: WritableSignal<T>, paramName: string, type: 'string' | 'number' | 'boolean' = 'string') {
    // Inject ActivatedRoute here, so it uses the Component's context
    const route = inject(ActivatedRoute) as ActivatedRoute;

    // 1. Restore from URL
    const params = route.snapshot.queryParams;
    const val = params[paramName];
    
    if (val !== undefined) {
      if (type === 'number' && !isNaN(Number(val))) targetSignal.set(Number(val) as T);
      else if (type === 'boolean') targetSignal.set((val === 'true') as T);
      else if (type === 'string') targetSignal.set(val as T);
    }

    // 2. Watch for changes and update URL
    let timeout: any;

    effect(() => {
      const newVal = targetSignal();
      
      // Avoid circular update if signal matches current URL param
      const currentParams = this.router.parseUrl(this.router.url).queryParams;
      if (String(currentParams[paramName]) === String(newVal)) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.router.navigate([], {
          relativeTo: route,
          queryParams: { [paramName]: newVal },
          queryParamsHandling: 'merge', // Keep other params
          replaceUrl: true
        });
      }, 300);
    });
  }
}
