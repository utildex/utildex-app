import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface ShortcutConfig {
  key: string;           // e.g., 'k', 'enter', 'escape'
  ctrlOrMeta?: boolean;  // Requires Ctrl (Win) or Cmd (Mac)
  alt?: boolean;
  shift?: boolean;
  description?: string;
  action: (event: KeyboardEvent) => void;
  allowInInput?: boolean; // If true, triggers even when typing in a text field
}

@Injectable({
  providedIn: 'root'
})
export class ShortcutService {
  private document = inject(DOCUMENT) as Document;
  private shortcuts = new Map<string, ShortcutConfig>();

  constructor() {
    this.document.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent));
  }

  register(id: string, config: ShortcutConfig) {
    this.shortcuts.set(id, config);
  }

  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  private handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    // Check if target exists and is an element that accepts input
    const isInput = target && (
      target instanceof HTMLInputElement || 
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    );

    for (const config of this.shortcuts.values()) {
      if (this.matches(event, config)) {
        if (isInput && !config.allowInInput) {
          continue;
        }
        
        event.preventDefault();
        config.action(event);
        return;
      }
    }
  }

  private matches(event: KeyboardEvent, config: ShortcutConfig): boolean {
    if (event.key.toLowerCase() !== config.key.toLowerCase()) return false;
    if (!!config.ctrlOrMeta !== (event.ctrlKey || event.metaKey)) return false;
    if (!!config.alt !== event.altKey) return false;
    if (!!config.shift !== event.shiftKey) return false;
    return true;
  }
}