import { Injectable } from '@angular/core';
import type {
  SandboxArtifact,
  SandboxArtifactManifest,
  ArtifactCacheStats,
  CacheManifestRecord,
} from '../../core/sandbox-artifact';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'simudex-artifact-cache';
const DB_VERSION = 1;
const STORE_CHUNKS = 'chunks';
const STORE_MANIFESTS = 'manifests';
const CHUNK_BYTES = 1024 * 1024; // 1 MB

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Generic download-and-cache engine for large sandbox artifacts.
 *
 * Downloads any artifact to IndexedDB in 1 MB chunks, reports progress,
 * and provides query / eviction APIs. Fully generic — no coupling to
 * Debian, CheerpX, or any specific sandbox.
 *
 * @example
 * ```ts
 * const cache = inject(ArtifactCacheService);
 * await cache.download(debianArtifact, (pct) => console.log(`${pct}%`));
 * const stats = await cache.getStats(debianArtifact.id);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ArtifactCacheService {
  // Per-artifact AbortControllers for cancellation.
  private readonly abortControllers = new Map<string, AbortController>();

  // ─── Public: Download ──────────────────────────────────────────────────

  /**
   * Download an artifact to IndexedDB.
   *
   * 1. Fetches the manifest from `artifact.manifestUrl`.
   * 2. Streams the artifact file in 1 MB chunks into IndexedDB.
   * 3. Verifies the SHA-256 checksum (if provided in the manifest).
   * 4. Marks the artifact as complete.
   *
   * Supports resumption: existing chunks are skipped.
   *
   * @param onProgress  Callback receiving 0–100 percentage.
   * @throws If the manifest fetch fails, the download fails, or SHA-256 mismatches.
   */
  async download(
    artifact: SandboxArtifact,
    onProgress: (pct: number) => void,
  ): Promise<void> {
    // ── Resolve manifest ────────────────────────────────────────────
    const manifest = await this.fetchManifest(artifact.manifestUrl);
    const downloadUrl = this.extractDownloadUrl(manifest);
    const totalBytes = this.extractSizeBytes(manifest);
    const sha256 = this.extractSha256(manifest);
    const version = this.extractVersion(manifest);

    if (!downloadUrl || !totalBytes) {
      throw new Error(
        `Manifest from ${artifact.manifestUrl} is missing url or sizeBytes.`,
      );
    }

    // ── Open DB and prepare ─────────────────────────────────────────
    const db = await this.openDB();
    const totalChunks = Math.ceil(totalBytes / CHUNK_BYTES);

    // Write or update manifest record.
    const manifestRecord: CacheManifestRecord = {
      artifact,
      totalBytes,
      downloadedBytes: 0,
      complete: false,
      createdAt: new Date().toISOString(),
      version,
      sha256,
      downloadUrl,
    };

    await this.writeManifest(db, artifact.id, manifestRecord);

    // ── Set up abort ────────────────────────────────────────────────
    const controller = new AbortController();
    this.abortControllers.set(artifact.id, controller);

    try {
      // ── Download ──────────────────────────────────────────────────
      const response = await fetch(downloadUrl, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(
          `Failed to download artifact: HTTP ${response.status} ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable (streaming not supported).');
      }

      let downloadedBytes = 0;
      let chunkIndex = 0;
      let buffer = new Uint8Array(0);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Append new data to buffer.
        const combined = new Uint8Array(buffer.length + value.length);
        combined.set(buffer);
        combined.set(value, buffer.length);
        buffer = combined;

        // Flush complete 1 MB chunks.
        while (buffer.length >= CHUNK_BYTES) {
          const chunk = buffer.slice(0, CHUNK_BYTES);
          buffer = buffer.slice(CHUNK_BYTES);

          // Skip if already downloaded (resumption).
          const existing = await this.readChunk(db, artifact.id, chunkIndex);
          if (!existing) {
            await this.writeChunk(db, artifact.id, chunkIndex, chunk.buffer);
          }

          downloadedBytes += chunk.length;
          chunkIndex += 1;

          await this.updateDownloadedBytes(db, artifact.id, downloadedBytes);
          // Download reports 0–90%, verification reports 90–100%.
          onProgress(Math.round((downloadedBytes / totalBytes) * 90));
        }
      }

      // Flush remaining bytes (last partial chunk).
      if (buffer.length > 0) {
        const existing = await this.readChunk(db, artifact.id, chunkIndex);
        if (!existing) {
          await this.writeChunk(db, artifact.id, chunkIndex, buffer.buffer);
        }
        downloadedBytes += buffer.length;
      }

      // ── Verify SHA-256 ────────────────────────────────────────────
      if (sha256 && typeof crypto !== 'undefined' && crypto.subtle) {
        const computed = await this.computeSha256(
          db,
          artifact.id,
          totalChunks,
          totalBytes,
          (verifiedChunks) => {
            onProgress(90 + Math.round((verifiedChunks / totalChunks) * 10));
          },
        );
        if (computed !== sha256.toLowerCase()) {
          throw new Error(
            `SHA-256 mismatch. Expected ${sha256}, got ${computed}. The download may be corrupted.`,
          );
        }
      }

      // ── Mark complete ─────────────────────────────────────────────
      manifestRecord.downloadedBytes = totalBytes;
      manifestRecord.complete = true;
      await this.writeManifest(db, artifact.id, manifestRecord);

      onProgress(100);
    } finally {
      this.abortControllers.delete(artifact.id);
      db.close();
    }
  }

  /** Cancel an in-progress download. */
  cancel(artifactId: string): void {
    const controller = this.abortControllers.get(artifactId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(artifactId);
    }
  }

  // ─── Public: Query ─────────────────────────────────────────────────────

  /** Check whether an artifact is fully cached. */
  async isCached(artifactId: string): Promise<boolean> {
    const record = await this.readManifest(artifactId);
    return record?.complete === true;
  }

  /** Get cache stats for one artifact. */
  async getStats(artifactId: string): Promise<ArtifactCacheStats | null> {
    const record = await this.readManifest(artifactId);
    if (!record) return null;

    return this.toStats(record, this.abortControllers.has(artifactId));
  }

  /** Get cache stats for all artifacts. */
  async getAllStats(): Promise<ArtifactCacheStats[]> {
    const db = await this.openDB();
    try {
      const records = await this.readAllManifests(db);
      return records.map((r) => this.toStats(r, this.abortControllers.has(r.artifact.id)));
    } finally {
      db.close();
    }
  }

  /** Total bytes stored across all cached artifacts. */
  async getTotalUsage(): Promise<number> {
    const stats = await this.getAllStats();
    return stats.reduce((sum, s) => sum + s.downloadedBytes, 0);
  }

  // ─── Public: Lifecycle ─────────────────────────────────────────────────

  /** Delete one artifact and all its chunks. */
  async evict(artifactId: string): Promise<void> {
    this.cancel(artifactId);

    const db = await this.openDB();
    try {
      // Delete all chunks.
      const chunkKeys = await this.getAllChunkKeys(db, artifactId);
      await this.deleteChunks(db, chunkKeys);

      // Delete manifest.
      await this.deleteManifest(db, artifactId);
    } finally {
      db.close();
    }
  }

  /** Delete all cached artifacts. */
  async evictAll(): Promise<void> {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();

    const db = await this.openDB();
    try {
      await this.clearStore(db, STORE_CHUNKS);
      await this.clearStore(db, STORE_MANIFESTS);
    } finally {
      db.close();
    }
  }

  // ─── Internal: Manifest fetch ──────────────────────────────────────────

  private async fetchManifest(url: string): Promise<SandboxArtifactManifest> {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch artifact manifest from ${url}: HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as SandboxArtifactManifest;

    if (!payload || typeof payload !== 'object') {
      throw new Error(`Invalid manifest from ${url}: not a JSON object.`);
    }

    return payload;
  }

  private extractDownloadUrl(manifest: SandboxArtifactManifest): string | undefined {
    return (manifest.rootfs?.url ?? manifest['url'] ?? manifest['downloadUrl']) as
      | string
      | undefined;
  }

  private extractSizeBytes(manifest: SandboxArtifactManifest): number | undefined {
    return (manifest.rootfs?.sizeBytes ?? manifest['sizeBytes'] ?? manifest['size']) as
      | number
      | undefined;
  }

  private extractSha256(manifest: SandboxArtifactManifest): string | undefined {
    return (manifest.rootfs?.sha256 ?? manifest['sha256'] ?? manifest['checksum']) as
      | string
      | undefined;
  }

  private extractVersion(manifest: SandboxArtifactManifest): string | undefined {
    return (manifest.version ?? manifest.rootfs?.revision) as string | undefined;
  }

  // ─── Internal: IndexedDB ───────────────────────────────────────────────

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
          db.createObjectStore(STORE_CHUNKS);
        }

        if (!db.objectStoreNames.contains(STORE_MANIFESTS)) {
          db.createObjectStore(STORE_MANIFESTS);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Chunk helpers ──────────────────────────────────────────────────

  private chunkKey(artifactId: string, index: number): string {
    return `${artifactId}/${String(index).padStart(4, '0')}`;
  }

  private writeChunk(
    db: IDBDatabase,
    artifactId: string,
    index: number,
    buffer: ArrayBuffer,
  ): Promise<void> {
    return this.promisifyIDBRequest<IDBValidKey>(
      db
        .transaction(STORE_CHUNKS, 'readwrite')
        .objectStore(STORE_CHUNKS)
        .put(buffer, this.chunkKey(artifactId, index)),
    ).then(() => undefined);
  }

  private readChunk(
    db: IDBDatabase,
    artifactId: string,
    index: number,
  ): Promise<ArrayBuffer | undefined> {
    return this.promisifyIDBRequest(
      db
        .transaction(STORE_CHUNKS, 'readonly')
        .objectStore(STORE_CHUNKS)
        .get(this.chunkKey(artifactId, index)),
    );
  }

  private async getAllChunkKeys(
    db: IDBDatabase,
    artifactId: string,
  ): Promise<string[]> {
    const allKeys = await this.promisifyIDBRequest<IDBValidKey[]>(
      db.transaction(STORE_CHUNKS, 'readonly').objectStore(STORE_CHUNKS).getAllKeys(),
    );

    const prefix = `${artifactId}/`;
    return (allKeys ?? []).filter((k): k is string => typeof k === 'string' && k.startsWith(prefix));
  }

  private deleteChunks(db: IDBDatabase, keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHUNKS, 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);

      for (const key of keys) {
        store.delete(key);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Manifest helpers ───────────────────────────────────────────────

  private writeManifest(
    db: IDBDatabase,
    artifactId: string,
    record: CacheManifestRecord,
  ): Promise<void> {
    return this.promisifyIDBRequest<IDBValidKey>(
      db
        .transaction(STORE_MANIFESTS, 'readwrite')
        .objectStore(STORE_MANIFESTS)
        .put(record, artifactId),
    ).then(() => undefined);
  }

  private async readManifest(
    artifactId: string,
  ): Promise<CacheManifestRecord | undefined> {
    const db = await this.openDB();
    try {
      return await this.promisifyIDBRequest<CacheManifestRecord | undefined>(
        db
          .transaction(STORE_MANIFESTS, 'readonly')
          .objectStore(STORE_MANIFESTS)
          .get(artifactId),
      );
    } finally {
      db.close();
    }
  }

  private readAllManifests(db: IDBDatabase): Promise<CacheManifestRecord[]> {
    return this.promisifyIDBRequest<CacheManifestRecord[]>(
      db.transaction(STORE_MANIFESTS, 'readonly').objectStore(STORE_MANIFESTS).getAll(),
    ).then((r) => r ?? []);
  }

  private deleteManifest(db: IDBDatabase, artifactId: string): Promise<void> {
    return this.promisifyIDBRequest(
      db
        .transaction(STORE_MANIFESTS, 'readwrite')
        .objectStore(STORE_MANIFESTS)
        .delete(artifactId),
    );
  }

  private async updateDownloadedBytes(
    db: IDBDatabase,
    artifactId: string,
    downloadedBytes: number,
  ): Promise<void> {
    const record = await this.promisifyIDBRequest<CacheManifestRecord | undefined>(
      db
        .transaction(STORE_MANIFESTS, 'readwrite')
        .objectStore(STORE_MANIFESTS)
        .get(artifactId),
    );

    if (record) {
      record.downloadedBytes = downloadedBytes;
      await this.writeManifest(db, artifactId, record);
    }
  }

  private clearStore(db: IDBDatabase, storeName: string): Promise<void> {
    return this.promisifyIDBRequest(
      db.transaction(storeName, 'readwrite').objectStore(storeName).clear(),
    );
  }

  // ── SHA-256 ───────────────────────────────────────────────────────

  private async computeSha256(
    db: IDBDatabase,
    artifactId: string,
    totalChunks: number,
    totalBytes: number,
    onChunkVerified?: (index: number) => void,
  ): Promise<string> {
    this.hashState = null;
    let bytesHashed = 0;

    for (let i = 0; i < totalChunks; i += 1) {
      const chunk = await this.readChunk(db, artifactId, i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i} during SHA-256 verification.`);
      }

      const toHash = bytesHashed + chunk.byteLength > totalBytes
        ? new Uint8Array(chunk.slice(0, totalBytes - bytesHashed))
        : new Uint8Array(chunk);

      await this.incrementalHash(toHash);
      bytesHashed += toHash.byteLength;
      onChunkVerified?.(i);
    }

    return this.finalizeHash();
  }

  private hashState: { buffer: Uint8Array; offset: number } | null = null;

  private async incrementalHash(data: Uint8Array): Promise<void> {
    if (!this.hashState) {
      this.hashState = { buffer: new Uint8Array(0), offset: 0 };
    }

    const combined = new Uint8Array(this.hashState.buffer.length + data.length);
    combined.set(this.hashState.buffer);
    combined.set(data, this.hashState.buffer.length);
    this.hashState.buffer = combined;
  }

  private async finalizeHash(): Promise<string> {
    if (!this.hashState) return '';

    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      this.hashState.buffer as unknown as ArrayBuffer,
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    this.hashState = null;
    return hex;
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private toStats(record: CacheManifestRecord, downloading: boolean): ArtifactCacheStats {
    return {
      artifactId: record.artifact.id,
      name: record.artifact.name,
      sandbox: record.artifact.sandbox,
      runtime: record.artifact.runtime,
      totalBytes: record.totalBytes,
      downloadedBytes: record.downloadedBytes,
      complete: record.complete,
      downloading,
      createdAt: record.createdAt,
      version: record.version,
    };
  }

  private promisifyIDBRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
