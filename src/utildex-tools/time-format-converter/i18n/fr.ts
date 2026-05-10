export default {
  TITLE: 'Convertisseur de formats de date',
  PRIVACY_NOTE: 'Aucune donn\u00e9e ne quitte votre appareil. Toute la conversion est locale.',
  DST_NOTE:
    'Heure d\u2019\u00e9t\u00e9 et d\u00e9calages historiques r\u00e9solus par votre navigateur.',

  LABEL_INPUT: 'Date ou heure',
  LABEL_INPUT_PLACEHOLDER:
    'ex. 2026-05-10T12:34:56Z, 1746878400, Sun, 10 May 2026 12:34:56 +0200\u2026',
  LABEL_ZONE: 'Fuseau local',
  ZONE_SEARCH_PLACEHOLDER: 'Rechercher une ville ou un fuseau\u2026',
  ZONE_SEARCH_EMPTY: 'Aucun fuseau correspondant',
  LABEL_NOW: 'Maintenant',

  RESULT_DETECTED: 'Format d\u00e9tect\u00e9',
  RESULT_INVALID:
    'Impossible d\u2019analyser cette valeur. Essayez ISO 8601, RFC 2822, SQL ou un horodatage Unix.',

  FORMAT_ISO8601: 'ISO 8601',
  FORMAT_RFC3339: 'RFC 3339',
  FORMAT_RFC2822: 'RFC 2822',
  FORMAT_UNIX_S: 'Unix (secondes)',
  FORMAT_UNIX_MS: 'Unix (millisecondes)',
  FORMAT_SQL_DATETIME: 'SQL DATETIME',
  FORMAT_SQL_DATE: 'SQL DATE',
  FORMAT_HTTP_DATE: 'En-t\u00eate HTTP',
  FORMAT_LOCALE: 'Cha\u00eene locale',
  FORMAT_UNKNOWN: 'Inconnu',

  GROUP_INTERNET: 'Internet',
  GROUP_EPOCH: 'Unix',
  GROUP_SQL: 'SQL',
  GROUP_LOCALE: 'Local',

  ROW_ISO_UTC: 'ISO 8601 (UTC)',
  ROW_ISO_LOCAL: 'ISO 8601 (avec offset)',
  ROW_RFC2822: 'RFC 2822',
  ROW_HTTP: 'En-t\u00eate HTTP',
  ROW_UNIX_S: 'Unix secondes',
  ROW_UNIX_MS: 'Unix millisecondes',
  ROW_SQL_UTC: 'SQL DATETIME (UTC)',
  ROW_SQL_LOCAL: 'SQL DATETIME (fuseau)',
  ROW_SQL_DATE: 'SQL DATE',
  ROW_LOCALE_SHORT: 'Local (court)',
  ROW_LOCALE_LONG: 'Local (long)',

  COPY_VALUE: 'Copier',
  COPY_ALL: 'Tout copier',

  EXAMPLES_LABEL: 'Essayer un exemple',
} as const;
