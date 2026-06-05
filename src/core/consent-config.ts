// ---------------------------------------------------------------------------
// Consent System — generic reusable infrastructure for asking users
// for permission before large downloads or data-intensive operations.
// ---------------------------------------------------------------------------

/** Visual phase of the consent modal. */
export type ConsentPhase = 'prompt' | 'downloading' | 'complete' | 'refused' | 'error';

/**
 * Configuration a feature passes to ConsentService.ask().
 * The service and modal are fully generic — they don't know
 * what the download does, only how to present it.
 */
export interface ConsentConfig {
  /** Unique stable identifier. Survives page reloads. e.g. 'simudex/debian/rootfs'. */
  scope: string;

  /** Modal heading, e.g. 'Download Required'. */
  title: string;

  /** Plain-language explanation of what is being downloaded. */
  description: string;

  /** Human-readable size, e.g. '~629 MB'. */
  sizeLabel: string;

  /** Where data is persisted, e.g. "stored securely in your browser". */
  storageLabel: string;

  /** Material Symbols icon name displayed in the modal. */
  icon: string;

  /**
   * The download function. Receives a callback to report progress (0–100).
   * The service transitions to 'complete' on resolve, 'error' on reject.
   */
  downloadAction: (onProgress: (pct: number) => void) => Promise<void>;

  /** Shown when the user declines. */
  refuseMessage: string;

  /** Optional note displayed below the description before download starts. */
  preDownloadNote?: string;
}

/** Observable state of the consent modal. Single source of truth. */
export interface ConsentState {
  phase: ConsentPhase;
  config: ConsentConfig;
  /** 0–100. Only meaningful in 'downloading' phase. */
  progress: number;
  /** Set when phase === 'error'. */
  error?: string;
}

/** Resolved by ConsentService.ask() after the user makes a decision. */
export interface ConsentResult {
  consented: boolean;
}
