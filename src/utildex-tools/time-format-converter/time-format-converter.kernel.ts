import type { z } from 'zod';
import { schema } from './time-format-converter.schema';

/**
 * Time Format Converter — pure parsing + formatting kernel.
 *
 * Recognises and parses:
 *  - ISO 8601 / RFC 3339 (`2026-05-10T12:34:56Z`, `…+02:00`, `…-0500`, fractional seconds)
 *  - RFC 2822          (`Sun, 10 May 2026 12:34:56 +0200`)
 *  - HTTP-date         (RFC 7231 IMF-fixdate, identical to RFC 2822 with `GMT`)
 *  - SQL DATETIME       (`2026-05-10 12:34:56[.fff]`, optional `T`, optional offset)
 *  - SQL DATE           (`2026-05-10`)
 *  - Unix seconds       (10–11 digits, optional sign, optional `.fraction`)
 *  - Unix milliseconds  (12–14 digits)
 *  - Generic fallback   via `Date.parse` (locale strings, `Date.toString()` etc.)
 *
 * All parsing is done with hand-written regexes first to avoid host-locale
 * surprises; only the final fallback delegates to `Date.parse`.
 *
 * "Local" outputs use the user-supplied IANA zone (defaults to detected).
 * UTC offsets and zone arithmetic are computed from `Intl.DateTimeFormat`
 * `formatToParts`, so DST is handled correctly without external data.
 */

export type DetectedFormat = z.infer<typeof schema.output.shape.detectedFormat>;
export type FormattedTime = NonNullable<z.infer<typeof schema.output.shape.formatted>>;
export type ConvertInput = z.infer<typeof schema.input>;
export type ConvertOutput = z.infer<typeof schema.output>;

interface ParseResult {
  format: DetectedFormat;
  instantMs: number;
}

const ISO_RE =
  /^(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})[T ](?<H>\d{2}):(?<M>\d{2})(?::(?<S>\d{2})(?:\.(?<f>\d{1,9}))?)?(?<tz>Z|[+-]\d{2}:?\d{2})?$/;

const SQL_DATETIME_RE =
  /^(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})[ T](?<H>\d{2}):(?<M>\d{2})(?::(?<S>\d{2})(?:\.(?<f>\d{1,9}))?)?(?<tz>Z|[+-]\d{2}:?\d{2})?$/;

const SQL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const RFC2822_RE =
  /^(?:(?<wd>Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?(?<d>\d{1,2})\s+(?<mon>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(?<y>\d{2,4})\s+(?<H>\d{2}):(?<M>\d{2})(?::(?<S>\d{2}))?\s+(?<tz>UT|UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{4}|Z)$/i;

const UNIX_RE = /^-?\d+(?:\.\d+)?$/;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// Named offsets used by RFC 2822. `GMT`/`UT`/`UTC` and zero-offset Z are 0.
const NAMED_OFFSETS: Record<string, number> = {
  ut: 0,
  utc: 0,
  gmt: 0,
  z: 0,
  est: -5 * 60,
  edt: -4 * 60,
  cst: -6 * 60,
  cdt: -5 * 60,
  mst: -7 * 60,
  mdt: -6 * 60,
  pst: -8 * 60,
  pdt: -7 * 60,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function isValidIanaZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function zoneOffsetAt(zone: string, instantMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(instantMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - instantMs) / 60000);
}

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const m = Math.abs(minutes);
  return `${sign}${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function rfc2822Offset(raw: string): number | null {
  const lower = raw.toLowerCase();
  if (lower in NAMED_OFFSETS) return NAMED_OFFSETS[lower];
  const m = /^([+-])(\d{2})(\d{2})$/.exec(raw);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

function isoOffset(raw: string): number {
  if (raw === 'Z' || raw === 'z') return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(raw);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Parse a wall-clock date/time in a given zone to a UTC instant (DST-safe).
 * Used when the input format carries no offset (SQL DATETIME, SQL DATE).
 */
function wallToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  ms: number,
  zone: string,
): number | null {
  const naive = Date.UTC(y, mo, d, h, mi, s, ms);
  if (!Number.isFinite(naive)) return null;
  const off1 = zoneOffsetAt(zone, naive);
  const adjusted = naive - off1 * 60000;
  const off2 = zoneOffsetAt(zone, adjusted);
  return off1 === off2 ? adjusted : naive - off2 * 60000;
}

function parseFraction(f: string | undefined): number {
  if (!f) return 0;
  // Take first 3 digits as ms.
  return Number((f + '000').slice(0, 3));
}

export function parseTime(raw: string, zone: string): ParseResult | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Unix epoch (seconds or milliseconds, possibly fractional seconds).
  if (UNIX_RE.test(trimmed)) {
    const abs = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed;
    const intPart = abs.split('.')[0];
    const len = intPart.length;
    // Treat 12+ digit integers as ms; otherwise seconds (with fractional ms).
    if (len >= 12) {
      const v = Number(trimmed);
      if (!Number.isFinite(v)) return null;
      return { format: 'unix-ms', instantMs: Math.round(v) };
    }
    const v = Number(trimmed);
    if (!Number.isFinite(v)) return null;
    return { format: 'unix-s', instantMs: Math.round(v * 1000) };
  }

  // ISO 8601 / RFC 3339 — and the SQL DATETIME variant with a space separator
  // and no offset is matched by SQL_DATETIME_RE.
  const isoMatch = ISO_RE.exec(trimmed);
  if (isoMatch?.groups) {
    const g = isoMatch.groups;
    const y = Number(g['y']);
    const mo = Number(g['m']) - 1;
    const d = Number(g['d']);
    const h = Number(g['H']);
    const mi = Number(g['M']);
    const s = g['S'] != null ? Number(g['S']) : 0;
    const ms = parseFraction(g['f']);
    if (g['tz']) {
      const off = isoOffset(g['tz']);
      const instant = Date.UTC(y, mo, d, h, mi, s, ms) - off * 60000;
      const isRfc3339 = /T/.test(trimmed) && /(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed);
      return { format: isRfc3339 ? 'rfc3339' : 'iso8601', instantMs: instant };
    }
    // No offset: interpret in the supplied zone.
    const instant = wallToUtc(y, mo, d, h, mi, s, ms, zone);
    if (instant == null) return null;
    return { format: 'iso8601', instantMs: instant };
  }

  // SQL DATETIME without seconds offset (no offset = local zone).
  const sqlMatch = SQL_DATETIME_RE.exec(trimmed);
  if (sqlMatch?.groups) {
    const g = sqlMatch.groups;
    const y = Number(g['y']);
    const mo = Number(g['m']) - 1;
    const d = Number(g['d']);
    const h = Number(g['H']);
    const mi = Number(g['M']);
    const s = g['S'] != null ? Number(g['S']) : 0;
    const ms = parseFraction(g['f']);
    if (g['tz']) {
      const off = isoOffset(g['tz']);
      return { format: 'sql-datetime', instantMs: Date.UTC(y, mo, d, h, mi, s, ms) - off * 60000 };
    }
    const instant = wallToUtc(y, mo, d, h, mi, s, ms, zone);
    if (instant == null) return null;
    return { format: 'sql-datetime', instantMs: instant };
  }

  // SQL DATE → midnight in the supplied zone.
  const sqlDateMatch = SQL_DATE_RE.exec(trimmed);
  if (sqlDateMatch) {
    const [, ys, ms2, ds] = sqlDateMatch;
    const instant = wallToUtc(Number(ys), Number(ms2) - 1, Number(ds), 0, 0, 0, 0, zone);
    if (instant == null) return null;
    return { format: 'sql-date', instantMs: instant };
  }

  // RFC 2822 / HTTP-date.
  const rfcMatch = RFC2822_RE.exec(trimmed);
  if (rfcMatch?.groups) {
    const g = rfcMatch.groups;
    let y = Number(g['y']);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const mo = MONTHS[g['mon'].slice(0, 3).toLowerCase()];
    const d = Number(g['d']);
    const h = Number(g['H']);
    const mi = Number(g['M']);
    const s = g['S'] != null ? Number(g['S']) : 0;
    const off = rfc2822Offset(g['tz']);
    if (off == null) return null;
    const instant = Date.UTC(y, mo, d, h, mi, s, 0) - off * 60000;
    const isHttp = /\sGMT$/.test(trimmed);
    return { format: isHttp ? 'http-date' : 'rfc2822', instantMs: instant };
  }

  // Fallback — generic locale parse.
  const fallback = Date.parse(trimmed);
  if (Number.isFinite(fallback)) {
    return { format: 'locale', instantMs: fallback };
  }

  return null;
}

function describeInstantInZone(zone: string, instantMs: number) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const parts = dtf.formatToParts(new Date(instantMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
  };
}

const RFC2822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const RFC2822_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatRfc2822(instantMs: number, zone: string): string {
  const offMin = zoneOffsetAt(zone, instantMs);
  const local = describeInstantInZone(zone, instantMs);
  // Weekday at the local wall-clock instant in `zone`.
  const localWallUtc = Date.UTC(local.year, local.month - 1, local.day);
  const wd = RFC2822_DAYS[new Date(localWallUtc).getUTCDay()];
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const off = `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
  return `${wd}, ${pad2(local.day)} ${RFC2822_MONTHS[local.month - 1]} ${local.year} ${pad2(local.hour)}:${pad2(local.minute)}:${pad2(local.second)} ${off}`;
}

function formatHttpDate(instantMs: number): string {
  const utc = describeInstantInZone('UTC', instantMs);
  const wd = RFC2822_DAYS[new Date(instantMs).getUTCDay()];
  return `${wd}, ${pad2(utc.day)} ${RFC2822_MONTHS[utc.month - 1]} ${utc.year} ${pad2(utc.hour)}:${pad2(utc.minute)}:${pad2(utc.second)} GMT`;
}

function formatIsoLocal(instantMs: number, zone: string): string {
  const offMin = zoneOffsetAt(zone, instantMs);
  const ms = instantMs - offMin * 60000;
  const d = new Date(ms);
  const milli = ((instantMs % 1000) + 1000) % 1000;
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}.${pad3(milli)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

function formatSqlDateTime(instantMs: number, zone: string): string {
  const v = describeInstantInZone(zone, instantMs);
  return `${v.year}-${pad2(v.month)}-${pad2(v.day)} ${pad2(v.hour)}:${pad2(v.minute)}:${pad2(v.second)}`;
}

function formatLocaleShort(instantMs: number, zone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(instantMs));
}

function formatLocaleLong(instantMs: number, zone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(new Date(instantMs));
}

export function convert(input: ConvertInput): ConvertOutput {
  const zone = isValidIanaZone(input.zone ?? '') ? (input.zone as string) : detectLocalZone();
  const locale = (input.locale && input.locale.trim()) || detectLocale();
  const parsed = parseTime(input.raw, zone);
  if (!parsed) {
    return { valid: false, detectedFormat: 'unknown', instantMs: null, formatted: null };
  }
  const ms = parsed.instantMs;
  const utcIso = new Date(ms).toISOString();
  const utc = describeInstantInZone('UTC', ms);
  const offMin = zoneOffsetAt(zone, ms);
  const formatted: FormattedTime = {
    iso8601Utc: utcIso,
    iso8601Local: formatIsoLocal(ms, zone),
    rfc3339: utcIso,
    rfc2822: formatRfc2822(ms, zone),
    httpDate: formatHttpDate(ms),
    unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: ms,
    sqlDateTimeUtc: `${utc.year}-${pad2(utc.month)}-${pad2(utc.day)} ${pad2(utc.hour)}:${pad2(utc.minute)}:${pad2(utc.second)}`,
    sqlDateTimeLocal: formatSqlDateTime(ms, zone),
    sqlDate: `${utc.year}-${pad2(utc.month)}-${pad2(utc.day)}`,
    localeShort: formatLocaleShort(ms, zone, locale),
    localeLong: formatLocaleLong(ms, zone, locale),
    zone,
    offsetLabel: offsetLabel(offMin),
  };
  return {
    valid: true,
    detectedFormat: parsed.format,
    instantMs: ms,
    formatted,
  };
}

export function detectLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function detectLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

const CURATED_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function listSupportedZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    /* ignore */
  }
  return CURATED_ZONES;
}

export function run(input: ConvertInput): ConvertOutput {
  return convert(input);
}
