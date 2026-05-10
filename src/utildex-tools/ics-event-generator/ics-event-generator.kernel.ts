import type { z } from 'zod';
import { schema } from './ics-event-generator.schema';

/**
 * ICS Event Generator — emits an RFC 5545 VCALENDAR/VEVENT block from
 * structured input. All output is built in the browser; no network is used.
 *
 * Notes on time handling:
 *  - When `allDay` is true, DTSTART/DTEND use VALUE=DATE per RFC 5545 §3.6.1.
 *    DTEND is exclusive, so a one-day event ends on the next day.
 *  - When `allDay` is false, DTSTART/DTEND are emitted as
 *    `TZID=<zone>:YYYYMMDDTHHMMSS`. A minimal VTIMEZONE block is emitted with
 *    the current standard offset of the zone — sufficient for most calendar
 *    clients (which apply their own zone database). For UTC, `Z`-suffix form
 *    is used and no VTIMEZONE is emitted.
 *  - DTSTAMP is the current UTC instant (required, RFC 5545 §3.8.7.2).
 *
 * Folding: lines longer than 75 octets are folded with `\r\n ` as required by
 * RFC 5545 §3.1.
 *
 * Escaping: per §3.3.11 — `\\`, `\;`, `\,`, `\n` for newlines.
 */

export type ConvertInput = z.infer<typeof schema.input>;
export type ConvertOutput = z.infer<typeof schema.output>;

const PRODID = '-//utildex//ICS Event Generator 1.0//EN';

function isValidIanaZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
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
    const supported = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (Array.isArray(supported) && supported.length > 0) return supported;
  } catch {
    /* ignore */
  }
  return CURATED_ZONES;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
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

function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, zone: string): number {
  const naive = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
  const off1 = zoneOffsetAt(zone, naive);
  const adjusted = naive - off1 * 60000;
  const off2 = zoneOffsetAt(zone, adjusted);
  return off1 === off2 ? adjusted : naive - off2 * 60000;
}

interface Wall {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

function parseDate(s: string): { y: number; mo: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

function parseTime(s: string): { h: number; mi: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, mi };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a single logical line per RFC 5545 §3.1 (75-octet limit, CRLF + space). */
function foldLine(line: string): string {
  // Use UTF-8 byte length for octet count.
  const enc = new TextEncoder();
  const bytes = enc.encode(line);
  if (bytes.length <= 75) return line;
  // Walk codepoint-by-codepoint, accumulate up to 75 bytes per chunk.
  const chunks: string[] = [];
  let buf = '';
  let bufBytes = 0;
  // Use Array.from to iterate codepoints.
  for (const ch of line) {
    const chBytes = enc.encode(ch).length;
    // Continuation lines have a leading space, leaving 74 octets for content.
    const limit = chunks.length === 0 ? 75 : 74;
    if (bufBytes + chBytes > limit) {
      chunks.push(buf);
      buf = ch;
      bufBytes = chBytes;
    } else {
      buf += ch;
      bufBytes += chBytes;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.map((c, i) => (i === 0 ? c : ' ' + c)).join('\r\n');
}

function buildLine(name: string, value: string, params?: Record<string, string>): string {
  const paramStr = params
    ? Object.entries(params)
        .map(([k, v]) => `;${k}=${v}`)
        .join('')
    : '';
  return foldLine(`${name}${paramStr}:${value}`);
}

function formatDateUtc(instantMs: number): string {
  const d = new Date(instantMs);
  return (
    `${pad4(d.getUTCFullYear())}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function formatDateLocal(w: Wall): string {
  return `${pad4(w.y)}${pad2(w.mo)}${pad2(w.d)}T${pad2(w.h)}${pad2(w.mi)}00`;
}

function formatDateOnly(w: { y: number; mo: number; d: number }): string {
  return `${pad4(w.y)}${pad2(w.mo)}${pad2(w.d)}`;
}

function offsetTokens(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
}

function buildVtimezone(zone: string, sampleInstantMs: number): string[] {
  const off = zoneOffsetAt(zone, sampleInstantMs);
  const tok = offsetTokens(off);
  // Minimal but valid VTIMEZONE — STANDARD-only, no transitions. Most
  // calendar clients will still apply their own database for DST.
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${zone}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    `TZOFFSETFROM:${tok}`,
    `TZOFFSETTO:${tok}`,
    `TZNAME:${zone}`,
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
}

function uuid(): string {
  // RFC 4122 v4-style id; collision risk is irrelevant for ICS UID.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  let out = '';
  for (let i = 0; i < 32; i += 1) {
    if (i === 8 || i === 12 || i === 16 || i === 20) out += '-';
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

function safeFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .slice(0, 60)
    .trim();
  return (base || 'event') + '.ics';
}

function rruleHuman(input: ConvertInput): string | null {
  const f = input.recurrence;
  if (!f || f === 'none') return null;
  const ivl = input.recurrenceInterval ?? 1;
  const base = ivl === 1 ? `every ${f}` : `every ${ivl} ${f}${ivl === 1 ? '' : ''}`;
  let suffix = '';
  if (input.recurrenceCount) suffix = `, ${input.recurrenceCount} times`;
  else if (input.recurrenceUntil) suffix = `, until ${input.recurrenceUntil}`;
  return base + suffix;
}

function buildRrule(input: ConvertInput): string | null {
  if (!input.recurrence || input.recurrence === 'none') return null;
  const freq = input.recurrence.toUpperCase();
  const parts: string[] = [`FREQ=${freq}`];
  if (input.recurrenceInterval && input.recurrenceInterval > 1) {
    parts.push(`INTERVAL=${input.recurrenceInterval}`);
  }
  if (input.recurrenceCount) {
    parts.push(`COUNT=${input.recurrenceCount}`);
  } else if (input.recurrenceUntil) {
    const d = parseDate(input.recurrenceUntil);
    if (d) parts.push(`UNTIL=${formatDateOnly(d)}T235959Z`);
  }
  return parts.join(';');
}

export function convert(input: ConvertInput): ConvertOutput {
  const title = input.title?.trim();
  if (!title) {
    return error('Title is required.');
  }
  const allDay = !!input.allDay;
  const zone = isValidIanaZone(input.zone ?? '') ? (input.zone as string) : detectLocalZone();
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  if (!start) return error(`Invalid start date "${input.startDate}".`);
  if (!end) return error(`Invalid end date "${input.endDate}".`);

  let startInstant: number;
  let endInstant: number;
  let dtStartLine: string;
  let dtEndLine: string;
  let startWall: Wall | null = null;
  let endWall: Wall | null = null;

  if (allDay) {
    // DTEND is exclusive; if user picked the same end date, advance by one day.
    let endY = end.y;
    let endMo = end.mo;
    let endD = end.d;
    const sameDay = end.y === start.y && end.mo === start.mo && end.d === start.d;
    if (sameDay) {
      const next = new Date(Date.UTC(end.y, end.mo - 1, end.d + 1));
      endY = next.getUTCFullYear();
      endMo = next.getUTCMonth() + 1;
      endD = next.getUTCDate();
    }
    startInstant = Date.UTC(start.y, start.mo - 1, start.d);
    endInstant = Date.UTC(endY, endMo - 1, endD);
    if (endInstant <= startInstant) return error('End date must be on or after start date.');
    dtStartLine = buildLine('DTSTART', formatDateOnly(start), { VALUE: 'DATE' });
    dtEndLine = buildLine('DTEND', formatDateOnly({ y: endY, mo: endMo, d: endD }), {
      VALUE: 'DATE',
    });
  } else {
    const st = parseTime(input.startTime ?? '00:00');
    const et = parseTime(input.endTime ?? '00:00');
    if (!st) return error(`Invalid start time "${input.startTime}".`);
    if (!et) return error(`Invalid end time "${input.endTime}".`);
    startWall = { y: start.y, mo: start.mo, d: start.d, h: st.h, mi: st.mi };
    endWall = { y: end.y, mo: end.mo, d: end.d, h: et.h, mi: et.mi };
    startInstant = wallToUtc(start.y, start.mo, start.d, st.h, st.mi, zone);
    endInstant = wallToUtc(end.y, end.mo, end.d, et.h, et.mi, zone);
    if (endInstant <= startInstant) return error('End must be after start.');
    if (zone === 'UTC') {
      dtStartLine = buildLine('DTSTART', formatDateUtc(startInstant));
      dtEndLine = buildLine('DTEND', formatDateUtc(endInstant));
    } else {
      dtStartLine = buildLine('DTSTART', formatDateLocal(startWall), { TZID: zone });
      dtEndLine = buildLine('DTEND', formatDateLocal(endWall), { TZID: zone });
    }
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (!allDay && zone !== 'UTC') {
    lines.push(...buildVtimezone(zone, startInstant));
  }
  lines.push('BEGIN:VEVENT');
  lines.push(buildLine('UID', `${uuid()}@utildex`));
  lines.push(buildLine('DTSTAMP', formatDateUtc(Date.now())));
  lines.push(dtStartLine);
  lines.push(dtEndLine);
  lines.push(buildLine('SUMMARY', escapeText(title)));
  if (input.description?.trim()) {
    lines.push(buildLine('DESCRIPTION', escapeText(input.description.trim())));
  }
  if (input.location?.trim()) {
    lines.push(buildLine('LOCATION', escapeText(input.location.trim())));
  }
  if (input.url?.trim()) {
    // URL is a calendar-address-style property; do not text-escape (RFC 5545 §3.8.4.6).
    lines.push(buildLine('URL', input.url.trim()));
  }
  if (input.organizerEmail?.trim()) {
    const cn = input.organizerName?.trim();
    const params: Record<string, string> = {};
    if (cn) params.CN = `"${cn.replace(/"/g, '')}"`;
    lines.push(buildLine('ORGANIZER', `mailto:${input.organizerEmail.trim()}`, params));
  }
  lines.push(buildLine('STATUS', input.status ?? 'CONFIRMED'));
  const rrule = buildRrule(input);
  if (rrule) lines.push(buildLine('RRULE', rrule));
  for (const m of input.remindersMinutes ?? []) {
    lines.push('BEGIN:VALARM');
    lines.push(buildLine('ACTION', 'DISPLAY'));
    lines.push(buildLine('DESCRIPTION', escapeText(title)));
    lines.push(buildLine('TRIGGER', `-PT${Math.max(0, Math.floor(m))}M`));
    lines.push('END:VALARM');
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  const ics = lines.join('\r\n') + '\r\n';
  return {
    valid: true,
    error: null,
    ics,
    filename: safeFilename(title),
    summary: {
      title,
      startInstantMs: startInstant,
      endInstantMs: endInstant,
      zone,
      allDay,
      durationMinutes: Math.round((endInstant - startInstant) / 60000),
      rruleHuman: rruleHuman(input),
    },
  };
}

function error(message: string): ConvertOutput {
  return { valid: false, error: message, ics: null, filename: null, summary: null };
}

export function run(input: ConvertInput): ConvertOutput {
  return convert(input);
}
