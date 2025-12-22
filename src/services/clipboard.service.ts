import { Injectable, signal, inject } from '@angular/core';
import { ToastService } from './toast.service';

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  source?: string; // Optional: which tool generated this
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  history = signal<ClipboardItem[]>([]);
  private toast = inject(ToastService);

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
      source
    };

    this.history.update(prev => {
      // Remove duplicates of exact same text to keep history clean
      const filtered = prev.filter(item => item.text !== text);
      const updated = [newItem, ...filtered].slice(0, 20); // Keep last 20
      this.persistHistory(updated);
      return updated;
    });
  }

  clearHistory() {
    this.history.set([]);
    localStorage.removeItem('utildex-clipboard-history');
  }

  private loadHistory() {
    const saved = localStorage.getItem('utildex-clipboard-history');
    if (saved) {
      try {
        this.history.set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse clipboard history', e);
      }
    }
  }

  private persistHistory(items: ClipboardItem[]) {
    localStorage.setItem('utildex-clipboard-history', JSON.stringify(items));
  }
}