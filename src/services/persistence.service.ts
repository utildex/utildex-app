
import { Injectable, inject, WritableSignal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DbService } from './db.service';

export interface StorageOptions {
  type?: 'string' | 'number' | 'boolean';
  strategy?: 'idb' | 'local' | 'hybrid';
}

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private router: Router = inject(Router);
  private db: DbService = inject(DbService);

  /**
   * Syncs a signal with Storage (IDB or LocalStorage).
   * Supports 'hybrid' strategy for instant load (reads LocalStorage) + durable save (writes IDB).
   */
  storage<T>(targetSignal: WritableSignal<T>, key: string, optionsOrType: StorageOptions | 'string' | 'number' | 'boolean' = 'string') {
    // Normalize Options
    const options: StorageOptions = typeof optionsOrType === 'object' 
      ? optionsOrType 
      : { type: optionsOrType as 'string' | 'number' | 'boolean', strategy: 'idb' };
    
    const { type = 'string', strategy = 'idb' } = options;
    const fullKey = `utildex-state-${key}`;
    let isLoaded = false;

    // --- READ PHASE ---
    
    // 1. Hybrid/Local: Read SYNC from LocalStorage
    if (strategy === 'hybrid' || strategy === 'local') {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored !== null) {
          this.updateSignal(targetSignal, stored, type);
          isLoaded = true;
        }
      } catch (e) {
        console.warn('[Persistence] LocalStorage read failed', e);
      }
    }

    // 2. IDB/Hybrid: Read ASYNC from DB 
    // If hybrid, always reconcile with DB (source of truth) even if LocalStorage loaded.
    if ((strategy === 'idb' && !isLoaded) || strategy === 'hybrid') {
      this.db.config.read(fullKey).then(stored => {
        if (stored !== undefined && stored !== null) {
          this.updateSignal(targetSignal, String(stored), type);
        }
        isLoaded = true;
      });
    } else {
        isLoaded = true;
    }

    // --- WRITE PHASE ---
    
    effect((onCleanup) => {
      const val = targetSignal();
      if (!isLoaded) return;

      const timer = setTimeout(async () => {
        const strVal = String(val);

        if (strategy === 'local' || strategy === 'hybrid') {
          try {
            localStorage.setItem(fullKey, strVal);
          } catch (e) {
            console.warn('[Persistence] LocalStorage write failed', e);
          }
        }

        if (strategy === 'idb' || strategy === 'hybrid') {
          try {
            await this.db.config.write(fullKey, strVal);
          } catch (e) {
            console.error('[Persistence] IDB write failed', e);
          }
        }
      }, 300); // 300ms Debounce

      onCleanup(() => clearTimeout(timer));
    });
  }

  private updateSignal<T>(signal: WritableSignal<T>, value: string, type: string) {
      if (type === 'number') signal.set(Number(value) as T);
      else if (type === 'boolean') signal.set((value === 'true') as T);
      else signal.set(value as T);
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
    let timeout: ReturnType<typeof setTimeout> | undefined;

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
