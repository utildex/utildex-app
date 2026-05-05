import { signal, WritableSignal, computed, Signal } from '@angular/core';
import { DbService } from './db.service';

/**
 * A generic State Manager for tools backed by IndexedDB (records store).
 *
 * Usage:
 * class MyTool {
 *   state = new ToolState('my-tool', { count: 0 }, inject(DbService));
 *   count = this.state.select('count');
 *
 *   inc() { this.state.update(s => ({ count: s.count + 1 })); }
 * }
 */
import { APP_CONFIG } from '../core/app.config';

export class ToolState<T extends object> {
  private internalState: WritableSignal<T>;
  private dbId: number | undefined;
  private isLoaded = false;
  private readonly namespacedScope: string;

  constructor(
    private scope: string,
    private defaultState: T,
    private db: DbService,
  ) {
    this.namespacedScope = `${APP_CONFIG.appId as string}_${scope}`;
    this.internalState = signal<T>(defaultState);
    this.init();
  }

  /**
   * Select a specific property as a readonly Signal
   */
  select<K extends keyof T>(key: K): Signal<T[K]> {
    return computed(() => this.internalState()[key]);
  }

  /**
   * Select a derived value
   */
  derive<R>(selector: (state: T) => R): Signal<R> {
    return computed(() => selector(this.internalState()));
  }

  /**
   * Update state
   */
  update(updater: (current: T) => T) {
    this.internalState.update(updater);
    this.persist();
  }

  /**
   * Set specific property
   */
  set<K extends keyof T>(key: K, value: T[K]) {
    this.update((s) => ({ ...s, [key]: value }));
  }

  private async init() {
    try {
      const records = await this.db.records.list(this.namespacedScope);
      if (records && records.length > 0) {
        records.sort((a, b) => (b.id || 0) - (a.id || 0));

        const latest = records[0];
        this.dbId = latest.id;

        const savedState = latest.data as T;
        this.internalState.set({ ...this.defaultState, ...savedState });

        if (records.length > 1) {
          const duplicates = records.slice(1);
          Promise.all(
            duplicates.map((d) => (d.id ? this.db.records.delete(d.id) : Promise.resolve())),
          ).catch((err) =>
            console.warn(`[ToolState] Cleanup failed for ${this.namespacedScope}`, err),
          );
        }
      }
      this.isLoaded = true;
    } catch (e) {
      console.warn(`ToolState load failed for ${this.namespacedScope}`, e);
      // Fallback to defaults (already set)
      this.isLoaded = true;
    }
  }

  private persist() {
    if (!this.isLoaded) return;

    const data = this.internalState();

    this.saveDebounced(data);
  }

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private saveDebounced(data: T) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      try {
        if (this.dbId) {
          await this.db.records.delete(this.dbId);
        }
        this.dbId = await this.db.records.add(this.namespacedScope, data);
      } catch (err) {
        console.error(`[ToolState] Failed to save state for ${this.namespacedScope}`, err);
      }
    }, 500);
  }
}
