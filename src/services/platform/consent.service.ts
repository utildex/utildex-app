import { Injectable, inject, signal } from '@angular/core';
import type { ConsentConfig, ConsentResult, ConsentState } from '../../core/consent-config';
import { DbService } from '../data/db.service';

const CONSENT_KEY_PREFIX = 'consent:';

interface StoredConsent {
  consented: boolean;
  timestamp: number;
}

/**
 * Central service for requesting user consent before data-intensive operations.
 *
 * Features request consent via `ask(config)`. The service persists decisions
 * in IndexedDB so users are only asked once per scope. A downstream
 * ConsentModalComponent reads the `state` signal to render phases.
 *
 * @example
 * ```ts
 * const result = await consent.ask({
 *   scope: 'simudex/debian/rootfs',
 *   title: 'Download Required',
 *   description: 'The Debian terminal needs its operating system files…',
 *   sizeLabel: '~629 MB',
 *   storageLabel: 'stored securely in your browser',
 *   icon: 'terminal',
 *   downloadAction: (onProgress) => cache.download(artifact, onProgress),
 *   refuseMessage: 'Without these files, the terminal cannot start.',
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly db = inject(DbService);

  /** Observable state for the consent modal. `null` means the modal is hidden. */
  readonly state = signal<ConsentState | null>(null);

  /** Resolve function for the promise returned by ask(). */
  private _pendingResolve: ((result: ConsentResult) => void) | null = null;

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Request user consent for an operation.
   *
   * If the user has already consented to this scope, resolves immediately
   * with `{ consented: true }` without showing the modal.
   *
   * Otherwise sets `state` to `'prompt'` and returns a promise that
   * resolves when the user makes a decision.
   */
  async ask(config: ConsentConfig): Promise<ConsentResult> {
    if (await this.hasConsented(config.scope)) {
      return { consented: true };
    }

    return new Promise<ConsentResult>((resolve) => {
      this._pendingResolve = resolve;
      this.state.set({
        phase: 'prompt',
        config,
        progress: 0,
      });
    });
  }

  /** Check whether the user has already consented to a scope. */
  async hasConsented(scope: string): Promise<boolean> {
    const stored = await this.db.config.read(this.storageKey(scope));
    return (stored as StoredConsent | undefined)?.consented === true;
  }

  // ─── Modal actions (called by ConsentModalComponent) ───────────────────

  /** User clicked "Download" — start the download and transition phases. */
  async consent(): Promise<void> {
    const current = this.state();
    if (!current) return;

    this.state.set({ ...current, phase: 'downloading', progress: 0 });

    try {
      await current.config.downloadAction((pct) => this.reportProgress(pct));

      // Persist the decision so the user is never asked again for this scope.
      await this.db.config.write(this.storageKey(current.config.scope), {
        consented: true,
        timestamp: Date.now(),
      } satisfies StoredConsent);

      this.state.set({ ...current, phase: 'complete', progress: 100 });
      this._pendingResolve?.({ consented: true });
      this._pendingResolve = null;

      // Auto-dismiss the "complete" phase.
      setTimeout(() => this.dismissIfPhase('complete'), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state.update((s) => (s ? { ...s, phase: 'error', error: message } : null));
    }
  }

  /** User clicked "Not now" — transition to refused. */
  refuse(): void {
    const current = this.state();
    if (!current) return;

    this.state.set({ ...current, phase: 'refused' });
    this._pendingResolve?.({ consented: false });
    this._pendingResolve = null;
  }

  /** Dismiss the modal entirely. Called after 'complete', 'refused', 'error'. */
  dismiss(): void {
    this._pendingResolve = null;
    this.state.set(null);
  }

  /** Update download progress (0–100). Automatically transitions to verifying phase when appropriate. */
  reportProgress(pct: number): void {
    const clamped = Math.max(0, Math.min(100, pct));
    this.state.update((s) => {
      if (!s) return null;
      // Transition to verifying when download is essentially done (>= 90%).
      const phase =
        s.phase === 'downloading' && clamped >= 90 ? 'verifying' : s.phase;
      return { ...s, phase, progress: clamped };
    });
  }

  /** Forget a consent decision so the user is asked again. */
  async resetConsent(scope: string): Promise<void> {
    await this.db.config.delete(this.storageKey(scope));
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private storageKey(scope: string): string {
    return `${CONSENT_KEY_PREFIX}${scope}`;
  }

  private dismissIfPhase(target: ConsentState['phase']): void {
    if (this.state()?.phase === target) {
      this.dismiss();
    }
  }
}
