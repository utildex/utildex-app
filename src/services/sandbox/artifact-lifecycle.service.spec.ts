import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactLifecycleService } from './artifact-lifecycle.service';
import type { ArtifactState } from '../../core/artifact-lifecycle';

const ARTIFACT = { name: 'Debian OS', sandbox: 'simudex', runtime: 'debian' };
const ID = 'simudex/debian/rootfs';

describe('ArtifactLifecycleService', () => {
  let service: ArtifactLifecycleService;
  let now: number;

  beforeEach(() => {
    now = 1_000_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    service = new ArtifactLifecycleService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.ngOnDestroy();
  });

  /** Advance the mock clock by `ms` milliseconds. */
  function advanceTime(ms: number) {
    now += ms;
  }

  // ─── tryAcquireLock ────────────────────────────────────────────────────

  it('should acquire lock when absent (Guarantee A)', () => {
    expect(service.tryAcquireLock(ID, ARTIFACT)).toBe(true);

    const state = service.getState(ID);
    expect(state.phase).toBe('acquiring');
    expect(state.progress).toBe(0);
    expect(state.name).toBe('Debian OS');
  });

  it('should fail to acquire when already locked with fresh heartbeat (Guarantee A)', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    expect(service.tryAcquireLock(ID, ARTIFACT)).toBe(false);
    expect(service.getState(ID).phase).toBe('acquiring');
  });

  it('should re-acquire when heartbeat is stale > 30s (Guarantee B)', () => {
    service.tryAcquireLock(ID, ARTIFACT);

    // Advance time past the stale threshold and trigger the check.
    advanceTime(31_000);
    service.checkStaleHeartbeats(now);

    expect(service.getState(ID).phase).toBe('failed');

    // Now re-acquire should succeed.
    advanceTime(1);
    expect(service.tryAcquireLock(ID, ARTIFACT)).toBe(true);
    expect(service.getState(ID).phase).toBe('acquiring');
  });

  // ─── heartbeat ─────────────────────────────────────────────────────────

  it('should bump heartbeat timestamp (Guarantee B)', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    const first = service.getState(ID).heartbeat;

    advanceTime(10_000);
    service.heartbeat(ID);

    const second = service.getState(ID).heartbeat;
    expect(second).toBe(now);
  });

  // ─── Stale heartbeat auto-cleanup ──────────────────────────────────────

  it('should transition to failed after stale heartbeat (Guarantee B)', () => {
    service.tryAcquireLock(ID, ARTIFACT);

    advanceTime(31_000);
    service.checkStaleHeartbeats(now);

    expect(service.getState(ID).phase).toBe('failed');
    expect(service.getState(ID).error).toContain('interrupted');
  });

  it('should NOT transition when heartbeat is fresh', () => {
    service.tryAcquireLock(ID, ARTIFACT);

    advanceTime(10_000);
    service.heartbeat(ID);
    advanceTime(15_000); // 25s total.
    service.checkStaleHeartbeats(now);

    expect(service.getState(ID).phase).toBe('acquiring');
  });

  // ─── releaseLock ───────────────────────────────────────────────────────

  it('should release to absent (remove state)', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    service.releaseLock(ID, 'absent');
    expect(service.getState(ID).phase).toBe('absent');
  });

  it('should release to ready with stats', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    service.releaseLock(ID, 'ready', {
      stats: { totalBytes: 629_000_000, downloadedBytes: 629_000_000, version: '1.0' },
      progress: 100,
    });

    const state = service.getState(ID);
    expect(state.phase).toBe('ready');
    expect(state.stats!.totalBytes).toBe(629_000_000);
    expect(state.progress).toBe(100);
  });

  it('should release to failed with error', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    service.releaseLock(ID, 'failed', { error: 'Network failure' });

    const state = service.getState(ID);
    expect(state.phase).toBe('failed');
    expect(state.error).toBe('Network failure');
  });

  // ─── Concurrent artifacts ──────────────────────────────────────────────

  it('should allow concurrent acquires on different artifacts', () => {
    const redis = { name: 'Redis', sandbox: 'simudex', runtime: 'redis' };

    expect(service.tryAcquireLock(ID, ARTIFACT)).toBe(true);
    expect(service.tryAcquireLock('simudex/redis/dataset', redis)).toBe(true);
  });

  // ─── allStates / all signal ────────────────────────────────────────────

  it('should expose all tracked states via signal', () => {
    service.tryAcquireLock(ID, ARTIFACT);

    const states = service.all();
    expect(states).toHaveLength(1);
    expect(states[0].artifactId).toBe(ID);
  });

  it('should not include absent artifacts in all()', () => {
    service.tryAcquireLock(ID, ARTIFACT);
    service.releaseLock(ID, 'absent');
    expect(service.all()).toHaveLength(0);
  });

  // ─── Signal reactivity ─────────────────────────────────────────────────

  it('should emit signal on state changes', () => {
    const sub = service.all;
    expect(sub()).toHaveLength(0);

    service.tryAcquireLock(ID, ARTIFACT);
    expect(sub()).toHaveLength(1);
    expect(sub()[0].phase).toBe('acquiring');

    service.releaseLock(ID, 'ready', {
      stats: { totalBytes: 100, downloadedBytes: 100 },
    });
    expect(sub()[0].phase).toBe('ready');
  });
});
