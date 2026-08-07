// ---------------------------------------------------------------------------
// Artifact Lifecycle System — types for the state machine that governs
// the full lifecycle of large sandbox artifacts (download, verify, evict).
// ---------------------------------------------------------------------------

/** Phase in the artifact state machine. */
export type LifecyclePhase =
  | 'absent'
  | 'acquiring'
  | 'verifying'
  | 'ready'
  | 'failed'
  | 'evicting';

/** Observable state of one artifact. */
export interface ArtifactState {
  artifactId: string;
  phase: LifecyclePhase;
  /** 0–100. Meaningful only in 'acquiring' and 'verifying'. */
  progress: number;
  /** Date.now() of last heartbeat. Meaningful only in 'acquiring'. */
  heartbeat: number;
  /** Set when phase === 'ready'. */
  stats?: ArtifactLifecycleStats;
  /** Set when phase === 'failed'. */
  error?: string;
  /** User-facing artifact name. */
  name: string;
  /** Sandbox family. */
  sandbox: string;
  /** Runtime type. */
  runtime: string;
}

/** Lightweight stats stored in the lifecycle when an artifact is ready. */
export interface ArtifactLifecycleStats {
  totalBytes: number;
  downloadedBytes: number;
  version?: string;
}

/** Returned by evict() and nuke() — never silent. */
export interface DeletionReport {
  artifactId: string;
  name: string;
  chunksDeleted: number;
  overlayDeleted: boolean;
  consentReset: boolean;
  bytesFreed: number;
  errors: string[];
}

/** Returned by usage() — point-in-time storage breakdown. */
export interface StorageBreakdown {
  artifacts: {
    artifactId: string;
    name: string;
    rootfsBytes: number;
    overlayBytes: number;
    totalBytes: number;
    phase: LifecyclePhase;
  }[];
  grandTotalBytes: number;
  appStorageBytes: number;
  quotaBytes: number;
  quotaUsedBytes: number;
  quotaPercent: number;
}

/** Heartbeat considered stale after this many milliseconds. */
export const STALE_HEARTBEAT_MS = 30_000;

/** Heartbeat interval in milliseconds. */
export const HEARTBEAT_INTERVAL_MS = 5_000;
