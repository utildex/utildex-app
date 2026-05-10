export default {
  TITLE: 'Time Format Converter',
  PRIVACY_NOTE: 'No data leaves your device. All conversion runs locally.',
  DST_NOTE: 'DST and historical offsets resolved by your browser.',

  LABEL_INPUT: 'Date or time',
  LABEL_INPUT_PLACEHOLDER:
    'e.g. 2026-05-10T12:34:56Z, 1746878400, Sun, 10 May 2026 12:34:56 +0200…',
  LABEL_ZONE: 'Local time zone',
  ZONE_SEARCH_PLACEHOLDER: 'Search city or zone…',
  ZONE_SEARCH_EMPTY: 'No matching zones',
  LABEL_NOW: 'Now',

  RESULT_DETECTED: 'Detected format',
  RESULT_INVALID: 'Could not parse this value. Try ISO 8601, RFC 2822, SQL or a Unix timestamp.',

  FORMAT_ISO8601: 'ISO 8601',
  FORMAT_RFC3339: 'RFC 3339',
  FORMAT_RFC2822: 'RFC 2822',
  FORMAT_UNIX_S: 'Unix (seconds)',
  FORMAT_UNIX_MS: 'Unix (milliseconds)',
  FORMAT_SQL_DATETIME: 'SQL DATETIME',
  FORMAT_SQL_DATE: 'SQL DATE',
  FORMAT_HTTP_DATE: 'HTTP date',
  FORMAT_LOCALE: 'Locale string',
  FORMAT_UNKNOWN: 'Unknown',

  GROUP_INTERNET: 'Internet',
  GROUP_EPOCH: 'Epoch',
  GROUP_SQL: 'SQL',
  GROUP_LOCALE: 'Locale',

  ROW_ISO_UTC: 'ISO 8601 (UTC)',
  ROW_ISO_LOCAL: 'ISO 8601 (with offset)',
  ROW_RFC2822: 'RFC 2822',
  ROW_HTTP: 'HTTP date',
  ROW_UNIX_S: 'Unix seconds',
  ROW_UNIX_MS: 'Unix milliseconds',
  ROW_SQL_UTC: 'SQL DATETIME (UTC)',
  ROW_SQL_LOCAL: 'SQL DATETIME (zone)',
  ROW_SQL_DATE: 'SQL DATE',
  ROW_LOCALE_SHORT: 'Locale (short)',
  ROW_LOCALE_LONG: 'Locale (long)',

  COPY_VALUE: 'Copy',
  COPY_ALL: 'Copy all',

  EXAMPLES_LABEL: 'Try an example',
} as const;
