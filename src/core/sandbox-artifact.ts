// ---------------------------------------------------------------------------
// Generic Sandbox Artifact — used by ArtifactCacheService to download,
// store, and query any large binary asset for any sandbox runtime.
// ---------------------------------------------------------------------------

/**
 * Resolved manifest returned by an artifact's manifest endpoint.
 * e.g. https://runtime.simudex.org/sandboxes/simudex/debian/rootfs/latest.json
 */
export interface SandboxArtifactManifest {
  schemaVersion: number;
  sandbox: string;
  runtime: string;
  artifact: string;
  version: string;
  rootfs?: {
    url: string;
    sizeBytes: number;
    sha256?: string;
    revision?: string;
  };
  /** Generic payload — some manifests use a different shape. */
  [key: string]: unknown;
}

/**
 * Describes an artifact that can be downloaded and cached offline.
 * Each sandbox runtime defines one or more of these.
 */
export interface SandboxArtifact {
  /** Globally unique, e.g. 'simudex/debian/rootfs'. */
  id: string;
  /** User-facing name, e.g. 'Debian Operating System'. */
  name: string;
  /** Sandbox family, e.g. 'simudex'. */
  sandbox: string;
  /** Runtime type, e.g. 'debian', 'redis', 'postgres'. */
  runtime: string;
  /** URL to fetch the manifest that contains the download URL + size. */
  manifestUrl: string;
}

/**
 * Cache status for one artifact, returned by ArtifactCacheService.getStats().
 */
export interface ArtifactCacheStats {
  artifactId: string;
  name: string;
  sandbox: string;
  runtime: string;
  /** Total size of the artifact in bytes (from manifest). */
  totalBytes: number;
  /** Bytes downloaded so far. */
  downloadedBytes: number;
  /** Whether the full artifact is cached. */
  complete: boolean;
  /** Whether a download is currently in progress. */
  downloading: boolean;
  /** ISO timestamp of when the artifact was first cached. */
  createdAt: string;
  /** Artifact version (from manifest). */
  version?: string;
}

/** Internal manifest record stored in IndexedDB. */
export interface CacheManifestRecord {
  artifact: SandboxArtifact;
  totalBytes: number;
  downloadedBytes: number;
  complete: boolean;
  createdAt: string;
  version?: string;
  sha256?: string;
  downloadUrl?: string;
}
