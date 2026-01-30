import { Injectable, signal, WritableSignal } from '@angular/core';

export interface GuideState {
  isVisible: boolean;
  messageKey: string;
  // If null, it's a broadcast (centered notification). If set, it anchors to this.
  targetRect: DOMRect | null; 
  position: 'top' | 'bottom' | 'best';
}

@Injectable({
  providedIn: 'root'
})
export class GuideService {
  state: WritableSignal<GuideState> = signal({
    isVisible: false,
    messageKey: '',
    targetRect: null,
    position: 'best'
  });

  private hideTimer: any;

  /**
   * Show a context bubble anchored to an element
   */
  show(messageKey: string, element: HTMLElement, position: 'top' | 'bottom' | 'best' = 'best') {
    this.clearTimer();
    const rect = element.getBoundingClientRect();
    this.state.set({
      isVisible: true,
      messageKey,
      targetRect: rect,
      position
    });
  }

  /**
   * Show a global broadcast message (Notification mode)
   */
  notify(messageKey: string, duration = 5000) {
    this.clearTimer();
    this.state.set({
      isVisible: true,
      messageKey,
      targetRect: null,
      position: 'bottom'
    });

    this.hideTimer = setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    this.state.update(s => ({ ...s, isVisible: false }));
  }

  private clearTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
