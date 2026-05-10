import type { z } from 'zod';
import { schema } from './timestamp-converter.schema';

/**
 * Unix Timestamp Converter — pure computation kernel.
 *
 * Supports four units: seconds (s), milliseconds (ms), microseconds (us),
 * nanoseconds (ns). Microseconds and nanoseconds are carried as strings to
 * avoid Number precision loss above 2^53.
 *
 * Two modes:
 *  - parse:    a raw timestamp string + unit (or 'auto') → all formats.
 *  - compose:  a wall-clock date+time in a zone → all formats.
 */

export type EpochUnit = 's' | 'ms' | 'us' | 'ns';
export type ParseUnit = EpochUnit | 'auto';

export interface FormattedTimestamp {
  epochSeconds: number;
  epochMilliseconds: number;
  /** String to preserve precision beyond Number.MAX_SAFE_INTEGER. */
  epochMicroseconds: string;
  epochNanoseconds: string;
  utcIso: string;
  utcDate: string;
  utcTime: string;
  localDate: string;
  localTime: string;
  zoneDate: string;
  zoneTime: string;
  zone: string;
  offsetLabel: string;
  weekday: string;
  /** Human "in 5 minutes" / "3 hours ago", in English, neutral. */
  relative: string;
}

export type ConvertInput = z.infer<typeof schema.input>;
export type ConvertOutput = z.infer<typeof schema.output>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const SIGNED_INT_RE = /^-?\d+$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
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

/**
 * Auto-detect unit by magnitude. Heuristic boundaries chosen so that any
 * "current era" (1970–~2300) timestamp resolves correctly:
 *   |x| < 1e11   → seconds         (years up to ~5138)
 *   |x| < 1e14   → milliseconds    (years up to ~5138)
 *   |x| < 1e17   → microseconds
 *   else          → nanoseconds
 */
export function detectUnit(raw: string): EpochUnit {
  if (!SIGNED_INT_RE.test(raw)) return 'ms';
  // Use string length on absolute value to avoid Number overflow.
  const abs = raw.startsWith('-') ? raw.slice(1) : raw;
  const len = abs.length;
  if (len <= 11) return 's';
  if (len <= 14) return 'ms';
  if (len <= 17) return 'us';
  return 'ns';
}

/** Convert a value in `unit` to milliseconds (number). Loses sub-ms precision intentionally. */
function toMillis(raw: string, unit: EpochUnit): number | null {
  if (!SIGNED_INT_RE.test(raw)) return null;
  if (unit === 'ms') {
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  }
  if (unit === 's') {
    const v = Number(raw);
    return Number.isFinite(v) ? v * 1000 : null;
  }
  // us / ns: divide via BigInt to avoid Number imprecision, keep integer ms.
  try {
    const big = BigInt(raw);
    const divisor = unit === 'us' ? 1000n : 1_000_000n;
    const ms = Number(big / divisor);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/** Multiply a base value (ms) into the requested higher-precision unit, as string. */
function bigFromMillis(ms: number, unit: 'us' | 'ns'): string {
  const factor = unit === 'us' ? 1000n : 1_000_000n;
  return (BigInt(Math.trunc(ms)) * factor).toString();
}

function describeInstantInZone(zone: string, instantMs: number): {
  date: string;
  time: string;
  weekday: string;
  offsetLabel: string;
} {
  const offsetMin = zoneOffsetAt(zone, instantMs);
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
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
    weekday: get('weekday'),
    offsetLabel: offsetLabel(offsetMin),
  };
}

/** Convert a wall-clock date+time in `zone` to a UTC instant (ms). DST-safe. */
export function wallToUtc(date: string, time: string, zone: string): number | null {
  if (!ISO_DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [hStr, miStr, sStr = '00'] = time.split(':');
  const naive = Date.UTC(y, mo - 1, d, Number(hStr), Number(miStr), Number(sStr));
  if (!Number.isFinite(naive)) return null;
  const off1 = zoneOffsetAt(zone, naive);
  const adjusted = naive - off1 * 60000;
  const off2 = zoneOffsetAt(zone, adjusted);
  return off1 === off2 ? adjusted : naive - off2 * 60000;
}

function relativeFromMs(deltaMs: number): string {
  const sign = deltaMs < 0 ? -1 : 1;
  const abs = Math.abs(deltaMs);
  const sec = Math.round(abs / 1000);
  const choose = (value: number, singular: string, plural: string) =>
    `${value} ${value === 1 ? singular : plural}`;
  let label: string;
  if (sec < 5) label = 'just now';
  else if (sec < 60) label = choose(sec, 'second', 'seconds');
  else if (sec < 3600) label = choose(Math.round(sec / 60), 'minute', 'minutes');
  else if (sec < 86400) label = choose(Math.round(sec / 3600), 'hour', 'hours');
  else if (sec < 86400 * 30) label = choose(Math.round(sec / 86400), 'day', 'days');
  else if (sec < 86400 * 365) label = choose(Math.round(sec / (86400 * 30)), 'month', 'months');
  else label = choose(Math.round(sec / (86400 * 365)), 'year', 'years');
  if (label === 'just now') return label;
  return sign < 0 ? `${label} ago` : `in ${label}`;
}

function buildFormatted(instantMs: number, zone: string): FormattedTimestamp {
  const d = new Date(instantMs);
  const utcIso = d.toISOString();
  const utcParts = describeInstantInZone('UTC', instantMs);
  const zoneParts = describeInstantInZone(zone, instantMs);
  const local = describeInstantInZone(detectLocalZone(), instantMs);
  return {
    epochSeconds: Math.floor(instantMs / 1000),
    epochMilliseconds: instantMs,
    epochMicroseconds: bigFromMillis(instantMs, 'us'),
    epochNanoseconds: bigFromMillis(instantMs, 'ns'),
    utcIso,
    utcDate: utcParts.date,
    utcTime: utcParts.time,
    localDate: local.date,
    localTime: local.time,
    zoneDate: zoneParts.date,
    zoneTime: zoneParts.time,
    zone,
    offsetLabel: zoneParts.offsetLabel,
    weekday: zoneParts.weekday,
    relative: relativeFromMs(instantMs - Date.now()),
  };
}

export function convert(input: ConvertInput): ConvertOutput {
  if (input.mode === 'parse') {
    const raw = (input.raw ?? '').trim();
    if (!raw || !SIGNED_INT_RE.test(raw)) {
      return { valid: false, detectedUnit: null, formatted: null };
    }
    const unit: EpochUnit = !input.unit || input.unit === 'auto' ? detectUnit(raw) : input.unit;
    const ms = toMillis(raw, unit);
    if (ms == null || !Number.isFinite(ms)) {
      return { valid: false, detectedUnit: unit, formatted: null };
    }
    const zone = isValidIanaZone(input.zone ?? '') ? (input.zone as string) : detectLocalZone();
    return { valid: true, detectedUnit: unit, formatted: buildFormatted(ms, zone) };
  }

  // compose
  const date = input.date ?? '';
  const time = input.time ?? '';
  const zone = isValidIanaZone(input.zone ?? '') ? (input.zone as string) : detectLocalZone();
  const ms = wallToUtc(date, time, zone);
  if (ms == null) return { valid: false, detectedUnit: null, formatted: null };
  return { valid: true, detectedUnit: 'ms', formatted: buildFormatted(ms, zone) };
}

export function detectLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
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
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.('timeZone');
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    /* ignore */
  }
  return CURATED_ZONES;
}

/** Headless entry point. */
export function run(input: ConvertInput): ConvertOutput {
  return convert(input);
}
