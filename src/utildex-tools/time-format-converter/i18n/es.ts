export default {
  TITLE: 'Conversor de formatos de fecha',
  PRIVACY_NOTE: 'Ning\u00fan dato sale de tu dispositivo. Toda la conversi\u00f3n es local.',
  DST_NOTE: 'Horario de verano y desfases hist\u00f3ricos resueltos por tu navegador.',

  LABEL_INPUT: 'Fecha u hora',
  LABEL_INPUT_PLACEHOLDER:
    'p. ej. 2026-05-10T12:34:56Z, 1746878400, Sun, 10 May 2026 12:34:56 +0200\u2026',
  LABEL_ZONE: 'Zona horaria local',
  ZONE_SEARCH_PLACEHOLDER: 'Buscar ciudad o zona\u2026',
  ZONE_SEARCH_EMPTY: 'Sin zonas coincidentes',
  LABEL_NOW: 'Ahora',

  RESULT_DETECTED: 'Formato detectado',
  RESULT_INVALID:
    'No se pudo analizar este valor. Prueba ISO 8601, RFC 2822, SQL o una marca Unix.',

  FORMAT_ISO8601: 'ISO 8601',
  FORMAT_RFC3339: 'RFC 3339',
  FORMAT_RFC2822: 'RFC 2822',
  FORMAT_UNIX_S: 'Unix (segundos)',
  FORMAT_UNIX_MS: 'Unix (milisegundos)',
  FORMAT_SQL_DATETIME: 'SQL DATETIME',
  FORMAT_SQL_DATE: 'SQL DATE',
  FORMAT_HTTP_DATE: 'Cabecera HTTP',
  FORMAT_LOCALE: 'Cadena local',
  FORMAT_UNKNOWN: 'Desconocido',

  GROUP_INTERNET: 'Internet',
  GROUP_EPOCH: 'Unix',
  GROUP_SQL: 'SQL',
  GROUP_LOCALE: 'Local',

  ROW_ISO_UTC: 'ISO 8601 (UTC)',
  ROW_ISO_LOCAL: 'ISO 8601 (con offset)',
  ROW_RFC2822: 'RFC 2822',
  ROW_HTTP: 'Cabecera HTTP',
  ROW_UNIX_S: 'Unix segundos',
  ROW_UNIX_MS: 'Unix milisegundos',
  ROW_SQL_UTC: 'SQL DATETIME (UTC)',
  ROW_SQL_LOCAL: 'SQL DATETIME (zona)',
  ROW_SQL_DATE: 'SQL DATE',
  ROW_LOCALE_SHORT: 'Local (corto)',
  ROW_LOCALE_LONG: 'Local (largo)',

  COPY_VALUE: 'Copiar',
  COPY_ALL: 'Copiar todo',

  EXAMPLES_LABEL: 'Probar un ejemplo',
} as const;
