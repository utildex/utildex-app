import { APP_CONFIG } from './app.config';

export const DB_STORES = {
  CONFIG: 'sys_config', // Key-Value (Settings)
  RECORDS: 'user_records', // Structured (History)
  BLOBS: 'app_blobs', // Binary (Files)
} as const;

const appId = APP_CONFIG.appId as string;

export const STORAGE_KEYS = {
  DASHBOARD_V2: `${appId}-dashboard-v2`,
  FAVORITES: `${appId}-favorites`,
  CLIPBOARD_HISTORY: `${appId}-clipboard-history`,
  USAGE_STATS: `${appId}-usage`,
  PREFIX_STATE: `${appId}-state-`,
  PREFIX_TOOLS: 'tools.',
  PREFIX_APP: `${appId}-`,

  PREFERENCES: ['theme', 'lang', 'color', 'font', 'density', 'tool-space', 'tool-space-last-tools'] as const,
};

/**
 * Returns the full storage key for a preference state.
 * e.g. 'theme' -> '{appId}-state-theme'
 */
export function getPrefKey(pref: string): string {
  return `${STORAGE_KEYS.PREFIX_STATE}${pref}`;
}
