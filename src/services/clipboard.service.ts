import { Injectable, signal, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { DbService } from './db.service';
import { STORAGE_KEYS } from '../core/storage-keys';

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  source?: string; // Optional: which tool generated this
}

@Injectable({
  providedIn: 'root',
})
export class ClipboardService {
  history = signal<ClipboardItem[]>([]);

  private toast = inject(ToastService);
  private db = inject(DbService);

  constructor() {
    this.loadHistory();
  }

  async copy(text: string, source?: string) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.addToHistory(text, source);
      this.toast.show('Copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy', err);
      this.toast.show('Failed to copy', 'error');
    }
  }

  private addToHistory(text: string, source?: string) {
    const newItem: ClipboardItem = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now(),
      source,
    };

    this.history.update((prev) => {
      const filtered = prev.filter((item) => item.text !== text);
      const updated = [newItem, ...filtered].slice(0, 20);
      this.persistHistory(updated);
      return updated;
    });
  }

  async clearHistory() {
    this.history.set([]);
    await this.db.delete(STORAGE_KEYS.CLIPBOARD_HISTORY);
  }

  private async loadHistory() {
    try {
      const saved = await this.db.get<ClipboardItem[]>(STORAGE_KEYS.CLIPBOARD_HISTORY);
      if (saved) this.history.set(saved);
    } catch (e) {
      console.error('Failed to parse clipboard history', e);
    }
  }

  private persistHistory(items: ClipboardItem[]) {
    this.db.set(STORAGE_KEYS.CLIPBOARD_HISTORY, items);
  }
}
