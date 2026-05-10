export default {
  TITLE: 'Unix Timestamp Converter',
  PRIVACY_NOTE: 'No data leaves your device. All conversion runs locally.',
  DST_NOTE: 'DST and historical offsets resolved by your browser.',

  MODE_PARSE: 'Timestamp → date',
  MODE_COMPOSE: 'Date → timestamp',

  LABEL_TIMESTAMP: 'Epoch timestamp',
  LABEL_TIMESTAMP_PLACEHOLDER: 'e.g. 1746878400 or 1746878400000',
  LABEL_UNIT: 'Unit',
  UNIT_AUTO: 'Auto',
  UNIT_S: 'Seconds',
  UNIT_MS: 'Milliseconds',
  UNIT_US: 'Microseconds',
  UNIT_NS: 'Nanoseconds',
  DETECTED_AS: 'Detected as {unit}',

  LABEL_DATE: 'Date',
  LABEL_TIME: 'Time',
  LABEL_ZONE: 'Time zone',
  ZONE_SEARCH_PLACEHOLDER: 'Search city or zone…',
  ZONE_SEARCH_EMPTY: 'No matching zones',

  LABEL_NOW: 'Now',
  LABEL_USE_LOCAL: 'Use my zone',

  RESULT_HEADING: 'Conversion',
  RESULT_INVALID: 'Enter a valid timestamp.',
  RESULT_INVALID_DATE: 'Enter a valid date and time.',

  RESULT_UTC: 'UTC',
  RESULT_LOCAL: 'Local',
  RESULT_ZONE: 'Selected zone',
  RESULT_RELATIVE: 'Relative',
  RESULT_ISO: 'ISO 8601',
  RESULT_EPOCH: 'Epoch values',
  RESULT_SECONDS: 'Seconds',
  RESULT_MILLISECONDS: 'Milliseconds',
  RESULT_MICROSECONDS: 'Microseconds',
  RESULT_NANOSECONDS: 'Nanoseconds',
  RESULT_WEEKDAY: 'Weekday',
  RESULT_OFFSET: 'UTC offset',

  COPY_VALUE: 'Copy',
  COPY_ALL: 'Copy all',
} as const;
