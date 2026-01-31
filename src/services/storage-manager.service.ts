
import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';

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
      patterns: [/^utildex-state-/]
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
      const keys = await this.db.keys();

      for (const key of keys) {
        // Fetch value to calculate size
        const value = await this.db.get(key);
        const valStr = typeof value === 'string' ? value : JSON.stringify(value);
        // Approx size (UTF-16 chars * 2 bytes)
        const size = (key.length + (valStr?.length || 0)) * 2; 

        let matched = false;

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

        if (matched) {
          stats.totalBytes += size;
        }
      }
    } catch (e) {
      console.error('Failed to calculate stats', e);
    }

    return stats;
  }

  async getCategoryDetails(categoryId: string): Promise<{ key: string; value: string }[]> {
    const stats = await this.getStats();
    const cat = stats.categories.find(c => c.id === categoryId);
    if (!cat) return [];

    const details: { key: string; value: string }[] = [];
    for (const key of cat.keys) {
      const val = await this.db.get(key);
      details.push({
        key,
        value: typeof val === 'string' ? val : JSON.stringify(val)
      });
    }
    return details;
  }

  async clearCategory(categoryId: string) {
    const stats = await this.getStats();
    const cat = stats.categories.find(c => c.id === categoryId);
    if (!cat) return;

    for (const key of cat.keys) {
      await this.db.delete(key);
    }
  }

  async factoryReset() {
    const keys = await this.db.keys();
    for (const key of keys) {
      if (key.startsWith('utildex-')) {
        await this.db.delete(key);
      }
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
    const keys = await this.db.keys();
    const exportObj: Record<string, unknown> = {};
    exportObj['meta'] = {
      version: 1,
      date: new Date().toISOString(),
      appName: 'Utildex'
    };

    for (const key of keys) {
      // Only export app keys
      if (key.startsWith('utildex-')) {
        exportObj[key] = await this.db.get(key);
      }
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

      // Clear existing state to avoid conflicts
      await this.factoryReset();

      for (const key in data) {
        if (key !== 'meta' && key.startsWith('utildex-')) {
          await this.db.set(key, data[key]);
        }
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
  }
}
