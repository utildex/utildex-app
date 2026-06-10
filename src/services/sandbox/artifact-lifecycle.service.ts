import { Injectable, OnDestroy, signal } from '@angular/core';
import type {
  ArtifactState,
  LifecyclePhase,
  ArtifactLifecycleStats,
} from '../../core/artifact-lifecycle';
import {
  STALE_HEARTBEAT_MS,
  HEARTBEAT_INTERVAL_MS,
} from '../../core/artifact-lifecycle';

/**
 * Pure state machine for artifact lifecycles.
 *
 * Responsibilities:
 * - Locking (only one acquire per artifact at a time)
 * - Heartbeat monitoring (detects crashed tabs)
 * - Phase transitions (absent → acquiring → verifying → ready / failed)
 * - Exposes observable state via a Signal
 *
 * No download logic, no consent, no UI. Just state + locking.
 */
@Injectable({ providedIn: 'root' })
export class ArtifactLifecycleService implements OnDestroy {
  // ── State ──────────────────────────────────────────────────────────────

  private readonly states = new Map<string, ArtifactState>();

  /** Observable list of all tracked artifacts. Components read this Signal. */
  readonly all = signal<ArtifactState[]>([]);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeatMonitor();
  }

  ngOnDestroy(): void {
    this.stopHeartbeatMonitor();
  }

  // ── State transitions ──────────────────────────────────────────────────

  /**
   * Atomically set the state for an artifact.
   * Fires the `all` signal so subscribers react.
   */
  transitionTo(
    artifactId: string,
    phase: LifecyclePhase,
    patch?: Partial<Omit<ArtifactState, 'artifactId' | 'phase'>>,
  ): void {
    const current = this.states.get(artifactId);

    const next: ArtifactState = {
      artifactId,
      phase,
      progress: patch?.progress ?? current?.progress ?? 0,
      heartbeat: patch?.heartbeat ?? current?.heartbeat ?? Date.now(),
      stats: patch?.stats ?? current?.stats,
      error: patch?.error ?? undefined,
      name: patch?.name ?? current?.name ?? artifactId,
      sandbox: patch?.sandbox ?? current?.sandbox ?? '',
      runtime: patch?.runtime ?? current?.runtime ?? '',
    };

    this.states.set(artifactId, next);
    this.emit();
  }

  /** Remove an artifact from tracking entirely. */
  remove(artifactId: string): void {
    this.states.delete(artifactId);
    this.emit();
  }

  /** Get the current state for one artifact. Returns absent if never tracked. */
  getState(artifactId: string): ArtifactState {
    return (
      this.states.get(artifactId) ?? {
        artifactId,
        phase: 'absent',
        progress: 0,
        heartbeat: 0,
        name: artifactId,
        sandbox: '',
        runtime: '',
      }
    );
  }

  /** Returns all tracked states (excludes absent). */
  allStates(): ArtifactState[] {
    return Array.from(this.states.values());
  }

  // ── Locking ────────────────────────────────────────────────────────────

  /**
   * Try to acquire the lock for an artifact.
   *
   * Returns true and sets phase to 'acquiring' if:
   * - The artifact is absent, OR
   * - The artifact is acquiring but the heartbeat is stale (>30s).
   *
   * Returns false if another tab is actively downloading.
   */
  tryAcquireLock(
    artifactId: string,
    artifact: { name: string; sandbox: string; runtime: string },
  ): boolean {
    const current = this.states.get(artifactId);

    if (!current || current.phase === 'absent') {
      this.transitionTo(artifactId, 'acquiring', {
        progress: 0,
        heartbeat: Date.now(),
        name: artifact.name,
        sandbox: artifact.sandbox,
        runtime: artifact.runtime,
      });
      return true;
    }

    if (current.phase === 'acquiring') {
      const stale = Date.now() - current.heartbeat > STALE_HEARTBEAT_MS;
      if (stale) {
        // Previous download crashed — clean up and restart.
        this.transitionTo(artifactId, 'acquiring', {
          progress: 0,
          heartbeat: Date.now(),
          name: artifact.name,
          sandbox: artifact.sandbox,
          runtime: artifact.runtime,
        });
        return true;
      }
      return false; // Someone else is downloading.
    }

    if (current.phase === 'ready') {
      return false; // Already cached — no need to acquire.
    }

    if (current.phase === 'failed') {
      this.transitionTo(artifactId, 'acquiring', {
        progress: 0,
        heartbeat: Date.now(),
        name: artifact.name,
        sandbox: artifact.sandbox,
        runtime: artifact.runtime,
      });
      return true;
    }

    if (current.phase === 'evicting') {
      return false; // Being deleted — wait.
    }

    // 'verifying' — still in progress, don't restart.
    return false;
  }

  /** Bump the heartbeat timestamp. Call periodically during download. */
  heartbeat(artifactId: string): void {
    const current = this.states.get(artifactId);
    if (current && current.phase === 'acquiring') {
      current.heartbeat = Date.now();
      this.emit();
    }
  }

  /**
   * Release the lock, transitioning to a terminal phase.
   *
   * @param phase  'ready' | 'failed' | 'absent'
   */
  releaseLock(
    artifactId: string,
    phase: 'ready' | 'failed' | 'absent',
    patch?: Partial<Pick<ArtifactState, 'stats' | 'error' | 'progress'>>,
  ): void {
    if (phase === 'absent') {
      this.remove(artifactId);
      return;
    }

    this.transitionTo(artifactId, phase, patch);
  }

  // ── Heartbeat monitor ──────────────────────────────────────────────────

  private startHeartbeatMonitor(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkStaleHeartbeats();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Exposed for testing — checks all acquiring states for stale heartbeats. */
  checkStaleHeartbeats(now: number = Date.now()): void {
    for (const [id, state] of this.states) {
      if (state.phase === 'acquiring' && now - state.heartbeat > STALE_HEARTBEAT_MS) {
        this.transitionTo(id, 'failed', {
          error: 'Download interrupted (tab closed or crashed).',
        });
      }
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private emit(): void {
    this.all.set(this.allStates());
  }
}
