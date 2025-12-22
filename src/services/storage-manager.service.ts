import { Injectable, signal } from '@angular/core';

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

  getStats(): StorageStats {
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

    // Iterate LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const val = localStorage.getItem(key) || '';
      // Approx size (UTF-16 chars * 2 bytes)
      const size = (key.length + val.length) * 2; 

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

      // If it's a utildex key but didn't match specific categories, bundle into 'tools' or ignore?
      // For now, only track known patterns to avoid deleting non-app data (if run on localhost shared port)
      if (matched) {
        stats.totalBytes += size;
      }
    }

    return stats;
  }

  getCategoryDetails(categoryId: string): { key: string; value: string }[] {
    const stats = this.getStats();
    const cat = stats.categories.find(c => c.id === categoryId);
    if (!cat) return [];

    return cat.keys.map(key => ({
      key,
      value: localStorage.getItem(key) || ''
    }));
  }

  clearCategory(categoryId: string) {
    const stats = this.getStats();
    const cat = stats.categories.find(c => c.id === categoryId);
    if (!cat) return;

    cat.keys.forEach(key => localStorage.removeItem(key));
  }

  factoryReset() {
    // Only clear Utildex keys to be safe
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('utildex-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}