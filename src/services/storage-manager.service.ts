
import { Injectable, inject } from '@angular/core';
import { DbService, DbRecord } from './db.service';

export interface StorageCategory {
  id: string;
  labelKey: string;
  icon: string;
  keys: string[];
  sizeBytes: number;
  count: number;
}

export interface StorageStats {
  totalBytes: number;
  categories: StorageCategory[];
}

@Injectable({
  providedIn: 'root'
})
export class StorageManagerService {
  private db = inject(DbService);
  
  // Categorization Logic
  private readonly DEFINITIONS = [
    {
      id: 'dashboard',
      labelKey: 'CAT_DASHBOARD',
      icon: 'dashboard',
      patterns: [/^utildex-dashboard-v2$/]
    },
    {
      id: 'favorites',
      labelKey: 'CAT_FAVORITES',
      icon: 'star',
      patterns: [/^utildex-favorites$/]
    },
    {
      id: 'history',
      labelKey: 'CAT_HISTORY',
      icon: 'history',
      patterns: [/^utildex-clipboard-history$/, /^utildex-usage$/]
    },
    {
      id: 'prefs',
      labelKey: 'CAT_PREFS',
      icon: 'tune',
      patterns: [/^utildex-theme$/, /^utildex-lang$/, /^utildex-color$/, /^utildex-font$/, /^utildex-density$/]
    },
    {
      id: 'tools',
      labelKey: 'CAT_TOOLS',
      icon: 'construction',
      patterns: [/^utildex-state-/, /^tools\./] 
    },
    {
      id: 'files',
      labelKey: 'CAT_FILES',
      icon: 'folder',
      patterns: [/^app_blobs/] // Conceptual pattern
    }
  ];

  async getStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalBytes: 0,
      categories: this.DEFINITIONS.map(def => ({
        id: def.id,
        labelKey: def.labelKey,
        icon: def.icon,
        keys: [],
        sizeBytes: 0,
        count: 0
      }))
    };

    try {
      // 1. CONFIG STORE (Settings & Legacy keys)
      // SysConfig keys are just strings
      const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, s => s.getAllKeys());
      if (configKeys) {
        for (const key of configKeys) {
            // We can't easily get value size cheaply without reading it. 
            // For stats, reading config (small) is fine.
            const val = await this.db.config.read(key);
            const valStr = JSON.stringify(val);
            const size = (key.length + (valStr?.length || 0)) * 2;
            
            this.addToStats(stats, key, size, 'prefs'); // Prefer prefs for config
        }
      }

      // 2. RECORDS STORE (Tool States)
      // Records have { scope, data }
      const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, s => s.getAll());
      if (records) {
        for (const rec of records) {
             const size = JSON.stringify(rec.data).length * 2;
             // Use 'scope' as the key equivalent for categorization
             // e.g. 'diff-checker' -> Tools
             // Force 'tools' category for all records
             this.addToStats(stats, rec.scope, size, 'tools');
        }
      }

      // 3. BLOBS STORE (Files)
      // Blobs keys are strings (IDs)
      const blobKeys = await this.db.run<string[]>('readonly', this.db.STORES.BLOBS, s => s.getAllKeys());
      if (blobKeys) {
         for (const key of blobKeys) {
             // For blobs, we assume they are files. 
             const dummySize = 1024 * 50; // Estimate 50KB if we don't read
             // Force 'files' category
             this.addToStats(stats, key, dummySize, 'files'); 
         }
      }

    } catch (e) {
      console.error('Failed to calculate stats', e);
    }

    return stats;
  }

  private addToStats(stats: StorageStats, key: string, size: number, limitToCategory?: string) {
        let matched = false;
        
        // 1. Try explicit category first if provided
        if (limitToCategory) {
            const cat = stats.categories.find(c => c.id === limitToCategory);
            if (cat) {
                 // Double check if it matches pattern? 
                 // Or just trust the store source?
                 // Trust source, but maybe pattern acts as filter?
                 // Let's trust source for Records/Blobs, but regex for Config.
                 
                 // If category is 'tools' or 'files', we just add it.
                 // If 'prefs', we still verify regex because Config potentially holds others (like History)
                 
                 if (limitToCategory === 'tools' || limitToCategory === 'files') {
                      cat.keys.push(key);
                      cat.sizeBytes += size;
                      cat.count++;
                      matched = true;
                 } else {
                     // For 'prefs', fallback to pattern matching below to sort internal Config items
                 }
            }
        }
        
        if (matched) {
             stats.totalBytes += size;
             return;
        }

        // 2. Try Regex Matching (Global Fallback or Config sorting)
        for (const cat of stats.categories) {
          const def = this.DEFINITIONS.find(d => d.id === cat.id);
          if (def && def.patterns.some(p => p.test(key))) {
            cat.keys.push(key);
            cat.sizeBytes += size;
            cat.count++;
            matched = true;
            break;
          }
        }

        stats.totalBytes += size;
  }

  async getCategoryDetails(categoryId: string): Promise<{ key: string; value: string }[]> {
    // This is tricky now because data is in different stores.
    // We might need to look up where the key came from.
    // Or we simply search all stores for the keys in that category.
    
    // Minimal implementation: Re-scan Config only for now, as that's where most viewable text data is.
    // Records are objects, Blobs are binary.
    
    const details: { key: string; value: string }[] = [];
    
    // Basic config scan
    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, s => s.getAllKeys());
    // ... filter by category ...
    // This method is used for the "Inspect" modal.
    // If likely Config:
    if (configKeys) {
        for(const k of configKeys) {
             // check if k belongs to categoryId (via regex)
             const def = this.DEFINITIONS.find(d => d.id === categoryId);
             if (def && def.patterns.some(p => p.test(k))) {
                 const v = await this.db.config.read(k);
                 details.push({ key: k, value: JSON.stringify(v) });
             }
        }
    }
    
    // User Records (Tools)
    if (categoryId === 'tools') {
         const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, s => s.getAll());
         if(records) {
             for(const r of records) {
                 details.push({ key: r.scope, value: JSON.stringify(r.data) });
             }
         }
    }
    
    return details;
  }

  async clearCategory(categoryId: string) {
    // 1. Clear matching Config keys
    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, s => s.getAllKeys());
    if (configKeys) {
        const def = this.DEFINITIONS.find(d => d.id === categoryId);
        if (def) {
            for (const key of configKeys) {
                if (def.patterns.some(p => p.test(key))) {
                    await this.db.config.delete(key);
                }
            }
        }
    }

    // 2. Clear Records if category is 'tools'
    if (categoryId === 'tools') {
         // Clear all records? Or just tool-related? 
         // Records store is 99% tools.
         await this.db.run('readwrite', this.db.STORES.RECORDS, s => s.clear());
    }

    // 3. Clear Blobs if category is 'files'
    if (categoryId === 'files') {
         await this.db.run('readwrite', this.db.STORES.BLOBS, s => s.clear());
    }
  }

  async factoryReset() {
    try {
        console.warn('Initiating Factory Reset...');
        
        // 1. Clear IndexedDB Stores
        await this.db.run('readwrite', this.db.STORES.CONFIG, s => s.clear());
        await this.db.run('readwrite', this.db.STORES.RECORDS, s => s.clear());
        await this.db.run('readwrite', this.db.STORES.BLOBS, s => s.clear());

        // 2. Clear LocalStorage (Specific Keys or All)
        // We'll be aggressive but safe: Clear utildex keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('utildex-')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('Factory Reset Complete.');
    } catch (e) {
        console.error('Factory Reset Failed', e);
        // Fallback: Try clearing LocalStorage anyway
        localStorage.clear();
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- Export / Import ---

  async exportData(): Promise<Blob> {
    const exportObj: Record<string, unknown> = {};
    exportObj['meta'] = {
      version: 2, // Bumped for V2 structure
      date: new Date().toISOString(),
      appName: 'Utildex'
    };
    
    // 1. Export Config
    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, s => s.getAllKeys());
    if (configKeys) {
        const configData: Record<string, unknown> = {};
        for(const k of configKeys) {
             configData[k] = await this.db.config.read(k);
        }
        exportObj['config'] = configData;
    }

    // 2. Export Records
    const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, s => s.getAll());
    if (records) {
        exportObj['records'] = records;
    }

    const json = JSON.stringify(exportObj, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importData(jsonContent: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.meta || data.meta.appName !== 'Utildex') {
        throw new Error('Invalid backup file');
      }

      // Clear existing state
      await this.factoryReset();

      // V2 Import
      if (data.meta.version >= 2) {
          // Import Config
          if (data.config) {
              for (const key in data.config) {
                  await this.db.config.write(key, data.config[key]);
              }
          }
          // Import Records
          if (data.records && Array.isArray(data.records)) {
              for (const rec of data.records) {
                  // Re-add record. ID auto-increments, so we ignore valid ID or force it?
                  // Better to let IDB assign new ID to avoid collisions, OR preserve if we care about linkage.
                  // For simple restoring, scope is what matters.
                  await this.db.records.add(rec.scope, rec.data);
              }
          }
      } else {
          // V1 Legacy Import (Flat keys)
          for (const key in data) {
            if (key !== 'meta' && key.startsWith('utildex-')) {
              await this.db.config.write(key, data[key]);
            }
          }
      }
      
      return true;
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
  }
}
