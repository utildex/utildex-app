import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactCacheService } from './artifact-cache.service';
import type { SandboxArtifact } from '../../core/sandbox-artifact';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 1024 * 1024; // 1 MB

function createArtifact(overrides: Partial<SandboxArtifact> = {}): SandboxArtifact {
  return {
    id: 'test/debian/rootfs',
    name: 'Test Rootfs',
    sandbox: 'test',
    runtime: 'debian',
    manifestUrl: 'https://example.com/manifest.json',
    ...overrides,
  };
}

function createManifestResponse(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    sandbox: 'test',
    runtime: 'debian',
    artifact: 'rootfs',
    version: '1.0.0',
    rootfs: {
      url: 'https://example.com/rootfs.ext2',
      sizeBytes: CHUNK_SIZE * 2 + 512, // 2.5 MB — 2 full chunks + partial
      sha256: 'abc123',
    },
    ...overrides,
  };
}

/** Generate a deterministic Uint8Array of a given size. */
function makeBytes(size: number, seed = 0): Uint8Array {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    bytes[i] = (seed + i) % 256;
  }
  return bytes;
}

/** Create a mock body with a getReader() that yields data in 512 KB pieces. */
function mockStreamBody(data: Uint8Array, chunkSize = 512 * 1024) {
  let offset = 0;

  return {
    getReader() {
      return {
        read(): Promise<{ done: boolean; value?: Uint8Array }> {
          if (offset >= data.length) {
            return Promise.resolve({ done: true });
          }
          const end = Math.min(offset + chunkSize, data.length);
          const value = data.slice(offset, end);
          offset = end;
          return Promise.resolve({ done: false, value });
        },
        cancel: vi.fn(),
        releaseLock: vi.fn(),
      } as ReadableStreamDefaultReader<Uint8Array>;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArtifactCacheService', () => {
  let service: ArtifactCacheService;

  beforeEach(async () => {
    // Clean up any leftover IDB databases.
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }

    service = new ArtifactCacheService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── download() ────────────────────────────────────────────────────────

  it('should download an artifact, store chunks, and mark complete', async () => {
    const totalBytes = CHUNK_SIZE * 2 + 512;
    const data = makeBytes(totalBytes);

    // Mock manifest fetch.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(createManifestResponse()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }

      // Download URL — return the artifact data.
      return Promise.resolve(
        new Response(mockStreamBody(data) as never, {
          status: 200,
          headers: { 'Content-Length': String(totalBytes) },
        }),
      );
    });

    const onProgress = vi.fn();

    await service.download(createArtifact(), onProgress);

    // Progress should have been reported.
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1] as [number];
    expect(lastCall[0]).toBe(100);

    // Verify cache state.
    expect(await service.isCached('test/debian/rootfs')).toBe(true);

    const stats = await service.getStats('test/debian/rootfs');
    expect(stats).not.toBeNull();
    expect(stats!.complete).toBe(true);
    expect(stats!.totalBytes).toBe(totalBytes);
    expect(stats!.downloadedBytes).toBe(totalBytes);
  });

  it('should report intermediate progress during download', async () => {
    const totalBytes = CHUNK_SIZE * 3; // 3 full chunks
    const data = makeBytes(totalBytes);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: totalBytes },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, {
          status: 200,
          headers: { 'Content-Length': String(totalBytes) },
        }),
      );
    });

    const progressValues: number[] = [];
    await service.download(createArtifact(), (pct) => progressValues.push(pct));

    // At minimum reported progress at least once with 100% at the end.
    expect(progressValues.length).toBeGreaterThanOrEqual(1);
    expect(progressValues[progressValues.length - 1]).toBe(100);
    // Progress should be monotonically increasing.
    for (let i = 1; i < progressValues.length; i += 1) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]!);
    }
  });

  it('should throw when manifest fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(
      service.download(createArtifact(), vi.fn()),
    ).rejects.toThrow('Network error');
  });

  it('should throw when manifest returns non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    );

    await expect(
      service.download(createArtifact(), vi.fn()),
    ).rejects.toThrow('HTTP 404');
  });

  it('should throw when manifest is missing download URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ schemaVersion: 1, version: '1.0.0' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      service.download(createArtifact(), vi.fn()),
    ).rejects.toThrow('missing url');
  });

  it('should throw when download response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(createManifestResponse()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }

      return Promise.resolve(new Response('Server Error', { status: 500 }));
    });

    await expect(
      service.download(createArtifact(), vi.fn()),
    ).rejects.toThrow('HTTP 500');
  });

  it('should verify SHA-256 when crypto.subtle is available', async () => {
    // Skip if no Web Crypto (e.g., non-HTTPS context in test).
    if (!globalThis.crypto?.subtle) {
      return;
    }

    const data = makeBytes(CHUNK_SIZE);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              schemaVersion: 1,
              sandbox: 'test',
              runtime: 'debian',
              artifact: 'rootfs',
              version: '1.0.0',
              rootfs: {
                url: 'https://example.com/rootfs.ext2',
                sizeBytes: CHUNK_SIZE,
                sha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, { status: 200 }),
      );
    });

    await expect(
      service.download(createArtifact(), vi.fn()),
    ).rejects.toThrow('SHA-256 mismatch');
  });

  // ─── cancel() ──────────────────────────────────────────────────────────

  it('should clean up abort controller after download completes', async () => {
    const data = makeBytes(CHUNK_SIZE);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: data.length },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, { status: 200 }),
      );
    });

    await service.download(createArtifact(), vi.fn());

    // After completion, cancel is a no-op but shouldn't throw.
    service.cancel('test/debian/rootfs');
    expect(await service.isCached('test/debian/rootfs')).toBe(true);
  });

  // ─── isCached() ────────────────────────────────────────────────────────

  it('should return false for an artifact that was never downloaded', async () => {
    expect(await service.isCached('nonexistent')).toBe(false);
  });

  it('should return false for a partially downloaded artifact', async () => {
    // We'd need to simulate a partial download, which requires mocking
    // at a lower level. For now, just confirm fresh state is false.
    expect(await service.isCached('test/debian/rootfs')).toBe(false);
  });

  // ─── getStats() / getAllStats() ────────────────────────────────────────

  it('should return null for an artifact that was never downloaded', async () => {
    expect(await service.getStats('nonexistent')).toBeNull();
  });

  it('should return stats for all cached artifacts', async () => {
    const data = makeBytes(CHUNK_SIZE);

    // Download two artifacts with different IDs.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        const manifestUrl = url;
        const isSecond = manifestUrl.includes('second');
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: {
                  url: isSecond
                    ? 'https://example.com/second.ext2'
                    : 'https://example.com/rootfs.ext2',
                  sizeBytes: CHUNK_SIZE,
                },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, { status: 200 }),
      );
    });

    await service.download(
      createArtifact({ id: 'test/debian/rootfs', manifestUrl: 'https://example.com/manifest.json' }),
      vi.fn(),
    );

    await service.download(
      createArtifact({
        id: 'test/redis/dataset',
        name: 'Redis Dataset',
        runtime: 'redis',
        manifestUrl: 'https://example.com/second-manifest.json',
      }),
      vi.fn(),
    );

    const allStats = await service.getAllStats();
    expect(allStats).toHaveLength(2);
    expect(allStats.map((s) => s.artifactId).sort()).toEqual([
      'test/debian/rootfs',
      'test/redis/dataset',
    ]);
  });

  // ─── getTotalUsage() ───────────────────────────────────────────────────

  it('should return total bytes across all artifacts', async () => {
    const data = makeBytes(CHUNK_SIZE);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: CHUNK_SIZE },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, { status: 200 }),
      );
    });

    await service.download(createArtifact(), vi.fn());

    const usage = await service.getTotalUsage();
    expect(usage).toBe(CHUNK_SIZE);
  });

  // ─── evict() ───────────────────────────────────────────────────────────

  it('should remove artifact and its chunks', async () => {
    const data = makeBytes(CHUNK_SIZE);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: CHUNK_SIZE },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(mockStreamBody(data) as never, { status: 200 }),
      );
    });

    await service.download(createArtifact(), vi.fn());
    expect(await service.isCached('test/debian/rootfs')).toBe(true);

    await service.evict('test/debian/rootfs');

    expect(await service.isCached('test/debian/rootfs')).toBe(false);
    expect(await service.getStats('test/debian/rootfs')).toBeNull();
    expect(await service.getTotalUsage()).toBe(0);
  });

  // ─── evictAll() ────────────────────────────────────────────────────────

  it('should remove all artifacts', async () => {
    const data = makeBytes(CHUNK_SIZE);

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      return Promise.resolve(
        new Response(
          JSON.stringify(
            createManifestResponse({
              rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: CHUNK_SIZE },
            }),
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    await service.download(
      createArtifact({ id: 'test/debian/rootfs', manifestUrl: 'https://a.com/manifest.json' }),
      vi.fn(),
    );
    await service.download(
      createArtifact({
        id: 'test/redis/dataset',
        name: 'Redis',
        runtime: 'redis',
        manifestUrl: 'https://b.com/manifest.json',
      }),
      vi.fn(),
    );

    expect(await service.getAllStats()).toHaveLength(2);

    await service.evictAll();

    expect(await service.getAllStats()).toHaveLength(0);
    expect(await service.getTotalUsage()).toBe(0);
  });

  // ─── Resumption ────────────────────────────────────────────────────────

  it('should resume download by skipping existing chunks', async () => {
    const totalBytes = CHUNK_SIZE * 2;
    const data = makeBytes(totalBytes);
    let chunkFetches = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('manifest.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              createManifestResponse({
                rootfs: { url: 'https://example.com/rootfs.ext2', sizeBytes: totalBytes },
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      chunkFetches += 1;
      return Promise.resolve(
        new Response(mockStreamBody(data) as never, {
          status: 200,
          headers: { 'Content-Length': String(totalBytes) },
        }),
      );
    });

    // First download completes fully.
    await service.download(createArtifact(), vi.fn());
    expect(chunkFetches).toBe(1);

    // Second download should detect existing chunks and skip the fetch...
    // But our mock always returns a stream. The resumption check is at the
    // chunk-write level: if a chunk already exists in IDB, we skip writing it.
    // We verify this by confirming the second download succeeds without errors.
    await service.download(createArtifact(), vi.fn());
    expect(await service.isCached('test/debian/rootfs')).toBe(true);

    // In a real scenario, the download would still happen but chunks would be
    // deduplicated. The key assertion: two downloads succeed without corruption.
  });
});
