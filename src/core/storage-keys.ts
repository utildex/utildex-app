export const DB_STORES = {
  CONFIG: 'sys_config',    // Key-Value (Settings)
  RECORDS: 'user_records', // Structured (History)
  BLOBS: 'app_blobs'       // Binary (Files)
} as const;

export const STORAGE_KEYS = {
  DASHBOARD_V2: 'utildex-dashboard-v2',
  FAVORITES: 'utildex-favorites',
  CLIPBOARD_HISTORY: 'utildex-clipboard-history',
  USAGE_STATS: 'utildex-usage',
  PREFIX_STATE: 'utildex-state-',
  PREFIX_TOOLS: 'tools.',
  PREFIX_APP: 'utildex-', // Legacy/Global prefix
  
  PREFERENCES: [
    'theme',
    'lang',
    'color',
    'font',
    'density'
  ]
} as const;

/**
 * Returns the full storage key for a preference state.
 * e.g. 'theme' -> 'utildex-state-theme'
 */
export function getPrefKey(pref: string): string {
    return `${STORAGE_KEYS.PREFIX_STATE}${pref}`;
}
