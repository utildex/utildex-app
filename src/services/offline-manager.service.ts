import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { TOOL_COMPONENT_MAP } from '../core/tool-registry';
import { PersistenceService } from './persistence.service';
import { DbService } from './db.service';
import { GuideService } from './guide.service';

@Injectable({
  providedIn: 'root'
})
export class OfflineManagerService {
  private persistence = inject(PersistenceService);
  private db = inject(DbService);
  private guide = inject(GuideService);

  // State
  isDownloading = signal(false);
  isStopping = signal(false);
  downloadedCount = signal(0);
  
  // Track downloaded tools persistence
  private downloadCacheKey = 'offline-tools-cache';
  downloadedTools = signal<Set<string>>(new Set());
  
  // Settings
  smartDownloadEnabled = signal(false);

  // Derived
  totalTools = computed(() => Object.keys(TOOL_COMPONENT_MAP).length);
  progress = computed(() => {
      const total = this.totalTools();
      if (total === 0) {
          return 0;
      }
      const downloaded = this.downloadedTools().size;
      return Math.round((downloaded / total) * 100);
  });

  private abortController: AbortController | null = null;
  private queue: string[] = [];

  constructor() {
    this.persistence.storage(this.smartDownloadEnabled, 'smart-download', 'boolean');
    this.loadCache();

    effect(() => {
      if (this.smartDownloadEnabled()) {
        this.initSmartLoader();
      }
    });
  }

  private async loadCache() {
      const saved = await this.db.get<string[]>(this.downloadCacheKey);
      if (saved && Array.isArray(saved)) {
          this.downloadedTools.set(new Set(saved));
      }
  }

  async downloadLibrary() {
    if (this.isDownloading()) return;

    // Check what is missing
    const allTools = Object.keys(TOOL_COMPONENT_MAP);
    const existing = this.downloadedTools();
    const missing = allTools.filter(id => !existing.has(id));

    if (missing.length === 0) {
        this.guide.notify('NOTIFY_LIB_DOWNLOADED', 4000);
        return;
    }
    
    this.isDownloading.set(true);
    this.isStopping.set(false);
    this.downloadedCount.set(0); 
    this.abortController = new AbortController();

    this.queue = missing;
    
    try {
      await this.processQueue();
      if (!this.isStopping()) {
           this.guide.notify('NOTIFY_LIB_DOWNLOADED', 6000);
      }
    } catch (e) {
      // Stopped
    } finally {
      this.isDownloading.set(false);
      this.isStopping.set(false);
    }
  }

  cancelDownload() {
    if (this.isDownloading()) {
      this.isStopping.set(true);
      if (this.abortController) {
        this.abortController.abort();
      }
    }
  }

  private async processQueue() {
    for (const toolId of this.queue) {
      if (this.isStopping() || this.abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      const importer = TOOL_COMPONENT_MAP[toolId];
      if (importer) {
        try {
          await importer();
          this.markAsDownloaded(toolId);
        } catch (err) {
          console.warn(`Failed to cache tool: ${toolId}`, err);
        }
      }
      
      this.downloadedCount.update(c => c + 1);
      
      // Throttle
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private markAsDownloaded(id: string) {
      this.downloadedTools.update(set => {
          const newSet = new Set(set);
          newSet.add(id);
          return newSet;
      });
      // Persist (fire and forget)
      this.db.set(this.downloadCacheKey, Array.from(this.downloadedTools()));
  }

  private initSmartLoader() {
    const idx = window.requestIdleCallback;
    if (idx) {
      // Small initial delay to let app startup finish
      idx(() => setTimeout(() => this.backgroundLoadStep(), 2000));
    } else {
      setTimeout(() => this.backgroundLoadStep(), 5000);
    }
  }

  private async backgroundLoadStep() {
      // Smart load: Check one missing tool and download it
      if (!this.smartDownloadEnabled()) return;
      
      const allTools = Object.keys(TOOL_COMPONENT_MAP);
      const existing = this.downloadedTools();
      const missing = allTools.find(id => !existing.has(id));

      if (missing) {
          try {
              const importer = TOOL_COMPONENT_MAP[missing];
              if (importer) {
                  await importer();
                  this.markAsDownloaded(missing);
              }
          } catch(e) { console.error(e); }
          
          // Next step
           const idx = window.requestIdleCallback;
           if (idx) idx(() => this.backgroundLoadStep());
           else setTimeout(() => this.backgroundLoadStep(), 2000);
      }
  }
}
