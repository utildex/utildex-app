
import { Injectable, inject, WritableSignal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DbService } from './db.service';
import { STORAGE_KEYS } from '../core/storage-keys';

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
    const options: StorageOptions = typeof optionsOrType === 'object' 
      ? optionsOrType 
      : { type: optionsOrType as 'string' | 'number' | 'boolean', strategy: 'idb' };
    
    const { type = 'string', strategy = 'idb' } = options;
    const fullKey = `${STORAGE_KEYS.PREFIX_STATE}${key}`;
    let isIdbHydrated = false;

    // --- READ PHASE ---
    
    // 1. Hybrid/Local: Read SYNC from LocalStorage
    if (strategy === 'hybrid' || strategy === 'local') {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored !== null) {
          this.updateSignal(targetSignal, stored, type);
          if (strategy === 'local') isIdbHydrated = true;
        }
      } catch (e) {
        console.warn('[Persistence] LocalStorage read failed', e);
      }
    }

    // 2. IDB/Hybrid: Read ASYNC from DB 
    if ((strategy === 'idb') || strategy === 'hybrid') {
      this.db.config.read(fullKey).then(stored => {
        if (stored !== undefined && stored !== null) {
          this.updateSignal(targetSignal, String(stored), type);
        }
        isIdbHydrated = true;
      });
    } else {
        // Strategy local, already set true above
    }

    // --- WRITE PHASE ---
    
    effect((onCleanup) => {
      const val = targetSignal();
      
      if (!isIdbHydrated && (strategy === 'idb' || strategy === 'hybrid')) {
           return;
      }

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
    const route = inject(ActivatedRoute);

    const params = route.snapshot.queryParams;
    const val = params[paramName];
    
    if (val !== undefined) {
      if (type === 'number' && !isNaN(Number(val))) targetSignal.set(Number(val) as T);
      else if (type === 'boolean') targetSignal.set((val === 'true') as T);
      else if (type === 'string') targetSignal.set(val as T);
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    effect(() => {
      const newVal = targetSignal();
      
      const currentParams = this.router.parseUrl(this.router.url).queryParams;
      if (String(currentParams[paramName]) === String(newVal)) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.router.navigate([], {
          relativeTo: route,
          queryParams: { [paramName]: newVal },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }, 300);
    });
  }
}
