export default {
  TITLE: 'Cron Expression Explainer',
  PRIVACY_NOTE: 'No data leaves your device. All parsing runs locally.',
  DST_NOTE: 'Next-run preview accounts for DST in your selected zone.',

  LABEL_EXPRESSION: 'Cron expression',
  LABEL_EXPRESSION_PLACEHOLDER: 'e.g. 0 9 * * 1-5',
  LABEL_ZONE: 'Time zone',
  ZONE_SEARCH_PLACEHOLDER: 'Search city or zone…',
  ZONE_SEARCH_EMPTY: 'No matching zones',
  LABEL_COUNT: 'Upcoming runs',

  RESULT_VALID: 'Valid',
  RESULT_INVALID: 'Invalid expression',
  RESULT_DESCRIPTION: 'Meaning',
  RESULT_NORMALIZED: 'Normalized',
  RESULT_FIELDS: 'Fields',
  RESULT_NEXT_RUNS: 'Next runs',

  FIELD_SECONDS: 'Seconds',
  FIELD_MINUTES: 'Minutes',
  FIELD_HOURS: 'Hours',
  FIELD_DOM: 'Day of month',
  FIELD_MONTH: 'Month',
  FIELD_DOW: 'Day of week',
  FIELD_YEAR: 'Year',

  EXAMPLES_LABEL: 'Try an example',
  EXAMPLE_HOURLY: 'Every hour',
  EXAMPLE_BUSINESS: 'Weekdays at 9am',
  EXAMPLE_MIDNIGHT: 'Every day at midnight',
  EXAMPLE_QUARTER: 'Every 15 minutes',
  EXAMPLE_FIRST_OF_MONTH: 'First of every month',
  EXAMPLE_QUARTZ_SECONDS: 'Every 30 seconds (Quartz)',

  COPY_VALUE: 'Copy',
  ANY: 'any',
} as const;
