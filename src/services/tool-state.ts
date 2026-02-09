
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
export class ToolState<T extends object> {
  private internalState: WritableSignal<T>;
  private dbId: number | undefined;
  private isLoaded = false;

  constructor(
    private scope: string, 
    private defaultState: T,
    private db: DbService
  ) {
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
    this.update(s => ({ ...s, [key]: value }));
  }

  private async init() {
    try {
      // Find existing record for this tool scope
      const records = await this.db.records.list(this.scope);
      if (records && records.length > 0) {
        // Sort by id descending (latest first) to recover most recent state
        records.sort((a, b) => (b.id || 0) - (a.id || 0));
        
        const latest = records[0];
        this.dbId = latest.id;
        
        // Merge saved state with defaults (for schema evolution)
        const savedState = latest.data as T;
        this.internalState.set({ ...this.defaultState, ...savedState });

        // Cleanup duplicates (older states) to maintain 1:1 mapping
        if (records.length > 1) {
             const duplicates = records.slice(1);
             Promise.all(duplicates.map(d => d.id ? this.db.records.delete(d.id) : Promise.resolve()))
                .catch(err => console.warn(`[ToolState] Cleanup failed for ${this.scope}`, err));
        }
      }
      this.isLoaded = true;
    } catch (e) {
      console.warn(`ToolState load failed for ${this.scope}`, e);
      // Fallback to defaults (already set)
      this.isLoaded = true;
    }
  }

  private persist() {
    if (!this.isLoaded) return;
    
    // Debounce handled by effect/timeout logic? 
    // For now, naive async save. In high-freq typing, we might want a debouncer here.
    const data = this.internalState();
    
    // If we have an ID, we delete/re-insert or update. 
    // Since our DbService.records.add doesn't support "update by ID" easily comfortably without 'put',
    // and we want to keep the 'append-only' log feel or 'latest state'?
    // Actually, for State, we want 'put'.
    
    // Refinement: DbService.records.add is for appending (History).
    // But ToolState implies "The Current Configuration".
    
    // Strategy: 
    // If we have an ID, delete it then Add new. (Simple, though ID changes).
    // Or we rely on 'scope' being the unique key concept for State.
    
    this.saveDebounced(data);
  }

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private saveDebounced(data: T) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
       try {
           // If we have an ID, we delete/re-insert or update. 
           // Since our DbService.records.add doesn't support "update by ID" easily comfortably without 'put',
           // and we want to keep the 'append-only' log feel or 'latest state'?
           // Actually, for State, we want 'put'.
           
           if (this.dbId) {
             await this.db.records.delete(this.dbId);
           }
           this.dbId = await this.db.records.add(this.scope, data);
       } catch (err) {
           console.error(`[ToolState] Failed to save state for ${this.scope}`, err);
       }
    }, 500);
  }
}
