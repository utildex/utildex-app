import { Injectable, inject } from '@angular/core';
import { DbService, DbRecord } from './db.service';
import { STORAGE_KEYS, getPrefKey } from '../core/storage-keys';

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
  providedIn: 'root',
})
export class StorageManagerService {
  private db = inject(DbService);

  // Categorization Logic
  private readonly DEFINITIONS = [
    {
      id: 'dashboard',
      labelKey: 'CAT_DASHBOARD',
      icon: 'dashboard',
      patterns: [new RegExp(`^${STORAGE_KEYS.DASHBOARD_V2}$`)],
    },
    {
      id: 'favorites',
      labelKey: 'CAT_FAVORITES',
      icon: 'star',
      patterns: [new RegExp(`^${STORAGE_KEYS.FAVORITES}$`)],
    },
    {
      id: 'history',
      labelKey: 'CAT_HISTORY',
      icon: 'history',
      patterns: [
        new RegExp(`^${STORAGE_KEYS.CLIPBOARD_HISTORY}$`),
        new RegExp(`^${STORAGE_KEYS.USAGE_STATS}$`),
      ],
    },
    {
      id: 'prefs',
      labelKey: 'CAT_PREFS',
      icon: 'tune',
      patterns: STORAGE_KEYS.PREFERENCES.map((p) => new RegExp(`^${getPrefKey(p)}$`)),
    },
    {
      id: 'pets',
      labelKey: 'CAT_PETS',
      icon: 'pets',
      patterns: [/^utildex-state-active-pets$/],
    },
    {
      id: 'tools',
      labelKey: 'CAT_TOOLS',
      icon: 'construction',
      patterns: [
        new RegExp(`^${STORAGE_KEYS.PREFIX_STATE}(?!${STORAGE_KEYS.PREFERENCES.join('|')})`),
        new RegExp(`^${STORAGE_KEYS.PREFIX_TOOLS.replace('.', '\\.')}`),
      ],
    },
    {
      id: 'files',
      labelKey: 'CAT_FILES',
      icon: 'folder',
      patterns: [/^app_blobs/],
    },
    {
      id: 'pipeline',
      labelKey: 'CAT_PIPELINE',
      icon: 'account_tree',
      patterns: [new RegExp(`^${STORAGE_KEYS.PIPELINE_GRAPH}$`)],
    },
  ];

  async getStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalBytes: 0,
      categories: this.DEFINITIONS.map((def) => ({
        id: def.id,
        labelKey: def.labelKey,
        icon: def.icon,
        keys: [],
        sizeBytes: 0,
        count: 0,
      })),
    };

    try {
      // 1. CONFIG STORE (Settings & Legacy keys)
      const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, (s) =>
        s.getAllKeys(),
      );
      if (configKeys) {
        for (const key of configKeys) {
          const val = await this.db.config.read(key);
          const valStr = JSON.stringify(val);
          const size = (key.length + (valStr?.length || 0)) * 2;

          this.addToStats(stats, key, size, 'prefs');
        }
      }

      // 2. RECORDS STORE (Tool States)
      // Records have { scope, data }
      const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, (s) =>
        s.getAll(),
      );
      if (records) {
        for (const rec of records) {
          const size = JSON.stringify(rec.data).length * 2;
          this.addToStats(stats, rec.scope, size, 'tools');
        }
      }

      // 3. BLOBS STORE (Files)
      // Blobs keys are strings (IDs)
      const blobKeys = await this.db.run<string[]>('readonly', this.db.STORES.BLOBS, (s) =>
        s.getAllKeys(),
      );
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
      const cat = stats.categories.find((c) => c.id === limitToCategory);
      if (cat) {
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
      const def = this.DEFINITIONS.find((d) => d.id === cat.id);
      if (def && def.patterns.some((p) => p.test(key))) {
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
    const details: { key: string; value: string }[] = [];

    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, (s) =>
      s.getAllKeys(),
    );

    if (configKeys) {
      for (const k of configKeys) {
        const def = this.DEFINITIONS.find((d) => d.id === categoryId);
        if (def && def.patterns.some((p) => p.test(k))) {
          const v = await this.db.config.read(k);
          details.push({ key: k, value: JSON.stringify(v) });
        }
      }
    }

    // User Records (Tools)
    if (categoryId === 'tools') {
      const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, (s) =>
        s.getAll(),
      );
      if (records) {
        for (const r of records) {
          details.push({ key: r.scope, value: JSON.stringify(r.data) });
        }
      }
    }

    // App Files (Blobs)
    if (categoryId === 'files') {
      const keys = await this.db.run<string[]>('readonly', this.db.STORES.BLOBS, (s) =>
        s.getAllKeys(),
      );
      if (keys) {
        for (const key of keys) {
          // We can't easily show content, but we can show metadata
          // Since this is just for inspection, showing the key is sufficient
          const blob = await this.db.blobs.get(key);
          const size = blob?.size ? this.formatBytes(blob.size) : 'Unknown';
          const type = blob?.type || 'Unknown Type';
          details.push({ key: key, value: `[File] ${type} (${size})` });
        }
      }
    }

    return details;
  }

  async clearCategory(categoryId: string) {
    // 1. Clear matching Config keys
    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, (s) =>
      s.getAllKeys(),
    );
    if (configKeys) {
      const def = this.DEFINITIONS.find((d) => d.id === categoryId);
      if (def) {
        for (const key of configKeys) {
          if (def.patterns.some((p) => p.test(key))) {
            await this.db.config.delete(key);
          }
        }
      }
    }

    // 2. Clear Records if category is 'tools'
    if (categoryId === 'tools') {
      await this.db.run('readwrite', this.db.STORES.RECORDS, (s) => s.clear());
    }

    // 3. Clear Blobs if category is 'files'
    if (categoryId === 'files') {
      await this.db.run('readwrite', this.db.STORES.BLOBS, (s) => s.clear());
    }
  }

  async factoryReset() {
    try {
      console.warn('Initiating Factory Reset...');

      // 1. Clear IndexedDB Stores
      await this.db.run('readwrite', this.db.STORES.CONFIG, (s) => s.clear());
      await this.db.run('readwrite', this.db.STORES.RECORDS, (s) => s.clear());
      await this.db.run('readwrite', this.db.STORES.BLOBS, (s) => s.clear());

      // 2. Clear LocalStorage (Specific Keys or All)
      // We'll be aggressive but safe: Clear utildex keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_KEYS.PREFIX_APP)) {
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
    const MAX_EXPORT_SIZE_MB = 100;
    const MAX_BYTES = MAX_EXPORT_SIZE_MB * 1024 * 1024;
    let estimatedSize = 0;

    const exportObj: Record<string, unknown> = {};
    exportObj['meta'] = {
      version: 2,
      date: new Date().toISOString(),
      appName: 'Utildex',
    };

    // 1. Export Config
    const configKeys = await this.db.run<string[]>('readonly', this.db.STORES.CONFIG, (s) =>
      s.getAllKeys(),
    );
    if (configKeys) {
      const configData: Record<string, unknown> = {};
      for (const k of configKeys) {
        const val = await this.db.config.read(k);
        configData[k] = val;
        estimatedSize += JSON.stringify(val).length;
      }
      exportObj['config'] = configData;
    }

    // 2. Export Records
    const records = await this.db.run<DbRecord[]>('readonly', this.db.STORES.RECORDS, (s) =>
      s.getAll(),
    );
    if (records) {
      exportObj['records'] = records;
      estimatedSize += JSON.stringify(records).length;
    }

    // 3. Export Blobs (Files)
    const blobKeys = await this.db.run<string[]>('readonly', this.db.STORES.BLOBS, (s) =>
      s.getAllKeys(),
    );
    if (blobKeys) {
      const filesData: Record<string, string> = {};
      for (const k of blobKeys) {
        // Check limit before reading next blob
        if (estimatedSize > MAX_BYTES) {
          throw new Error(
            `Export exceeds safe size limit of ${MAX_EXPORT_SIZE_MB}MB. Please delete some files and try again.`,
          );
        }

        const blob = await this.db.blobs.get(k);
        if (blob) {
          // Base64 overhead is ~33%
          const base64Size = blob.size * 1.37;
          estimatedSize += base64Size;

          if (estimatedSize > MAX_BYTES) {
            throw new Error(
              `Export exceeds safe size limit of ${MAX_EXPORT_SIZE_MB}MB. Please delete some files and try again.`,
            );
          }

          filesData[k] = await this.blobToBase64(blob);
        }
      }
      exportObj['files'] = filesData;
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
            await this.db.records.add(rec.scope, rec.data);
          }
        }
        // Import Files
        if (data.files) {
          for (const key in data.files) {
            const blob = await this.base64ToBlob(data.files[key]);
            await this.db.blobs.put(key, blob);
          }
        }
      } else {
        for (const key in data) {
          if (key !== 'meta' && key.startsWith(STORAGE_KEYS.PREFIX_STATE.replace('-', ''))) {
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

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64: string): Promise<Blob> {
    const res = await fetch(base64);
    return res.blob();
  }
}
