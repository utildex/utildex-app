import type { z } from 'zod';
import { schema } from './timezone-converter.schema';

/**
 * Time Zone Converter — pure computation kernel.
 *
 * Converts a wall-clock moment in a "source" IANA time zone into the equivalent
 * wall-clock time in any number of target IANA zones, with UTC offset and
 * day-shift information. All math is anchored to a UTC instant so DST and
 * arbitrary offsets resolve correctly.
 */

export interface ConvertInput {
  /** YYYY-MM-DD wall-clock date in the source zone. */
  date: string;
  /** HH:MM wall-clock time in the source zone (24h). */
  time: string;
  /** IANA zone the date+time belong to. */
  sourceZone: string;
  /** IANA zones to convert to. */
  targets: readonly string[];
}

export interface ConvertedZone {
  /** IANA zone id. */
  zone: string;
  /** YYYY-MM-DD in this zone. */
  date: string;
  /** HH:MM in this zone (24h). */
  time: string;
  /** Day delta vs. the source date (-1, 0, +1, ...). */
  dayDelta: number;
  /** Friendly weekday short name (Sun, Mon, ...) in en-US for stable IDs. */
  weekday: string;
  /** Offset from UTC in minutes (positive east of UTC). */
  offsetMinutes: number;
  /** "+05:30" / "-04:00" style label. */
  offsetLabel: string;
  /** Localized zone abbreviation if available (e.g. "PDT"), else offset label. */
  abbreviation: string;
}

export interface ConvertOutput {
  /** UTC ISO-8601 instant the source wall time resolves to (e.g. 2026-05-17T16:30:00Z). */
  utcIso: string | null;
  /** Source zone formatted alongside its targets (always at index 0). */
  source: ConvertedZone | null;
  /** Targets, in input order, deduplicated against the source zone. */
  targets: ConvertedZone[];
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidIanaZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Get the offset in minutes that the given zone has at the given UTC instant. */
function zoneOffsetAt(zone: string, instant: Date): number {
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
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Convert a wall clock date+time in a given IANA zone into a UTC Date instant.
 * Handles DST by iterating once: pick a tentative offset, recompute it at the
 * resulting instant, adjust if it shifted (the only edge case is the spring-
 * forward "skipped hour"; we accept the standard library's resolution).
 */
function wallToUtc(date: string, time: string, zone: string): Date | null {
  if (!ISO_DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const initial = new Date(naiveUtc);
  const offset1 = zoneOffsetAt(zone, initial);
  const adjusted = new Date(naiveUtc - offset1 * 60000);
  const offset2 = zoneOffsetAt(zone, adjusted);
  if (offset1 === offset2) return adjusted;
  return new Date(naiveUtc - offset2 * 60000);
}

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const m = Math.abs(minutes);
  return `${sign}${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** Format a UTC instant as a wall-clock view in a given zone. */
export function describeZone(zone: string, instant: Date, sourceDate?: string): ConvertedZone {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    timeZoneName: 'short',
  });
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}`;
  const weekday = get('weekday');
  const tzName = get('timeZoneName');
  const offset = zoneOffsetAt(zone, instant);
  const label = offsetLabel(offset);
  let dayDelta = 0;
  if (sourceDate && ISO_DATE_RE.test(sourceDate) && ISO_DATE_RE.test(date)) {
    const a = Date.UTC(
      Number(sourceDate.slice(0, 4)),
      Number(sourceDate.slice(5, 7)) - 1,
      Number(sourceDate.slice(8, 10)),
    );
    const b = Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
    );
    dayDelta = Math.round((b - a) / 86_400_000);
  }
  return {
    zone,
    date,
    time,
    dayDelta,
    weekday,
    offsetMinutes: offset,
    offsetLabel: label,
    abbreviation: tzName && !/^GMT/i.test(tzName) ? tzName : label,
  };
}

export function convert(input: ConvertInput): ConvertOutput {
  if (!isValidIanaZone(input.sourceZone)) {
    return { utcIso: null, source: null, targets: [] };
  }
  const instant = wallToUtc(input.date, input.time, input.sourceZone);
  if (!instant) return { utcIso: null, source: null, targets: [] };
  const source = describeZone(input.sourceZone, instant, input.date);
  const seen = new Set<string>([input.sourceZone]);
  const targets: ConvertedZone[] = [];
  for (const zone of input.targets) {
    if (seen.has(zone) || !isValidIanaZone(zone)) continue;
    seen.add(zone);
    targets.push(describeZone(zone, instant, input.date));
  }
  const utcIso = `${instant.toISOString().slice(0, 19)}Z`;
  return { utcIso, source, targets };
}

/** "Now" in the source zone — returns ISO date + 24h time. */
export function nowInZone(zone: string): { date: string; time: string } {
  const safeZone = isValidIanaZone(zone) ? zone : 'UTC';
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: safeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** Browser's detected IANA zone (or "UTC" if unavailable). */
export function detectLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** All supported IANA zones, sorted. Falls back to a curated list. */
export function listSupportedZones(): string[] {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      return intlAny
        .supportedValuesOf('timeZone')
        .slice()
        .sort((a, b) => a.localeCompare(b));
    } catch {
      /* ignore */
    }
  }
  return CURATED_ZONES.slice().sort((a, b) => a.localeCompare(b));
}

/** A short curated list used when supportedValuesOf is unavailable. */
export const CURATED_ZONES: readonly string[] = Object.freeze([
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Toronto',
  'America/Vancouver',
]);

/**
 * Run the kernel against a parsed input. Used by the headless/MCP runtime.
 */
export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const result = convert(input);
  return {
    utcIso: result.utcIso,
    source: result.source,
    targets: result.targets,
  };
}
