import type { z } from 'zod';
import { schema } from './meeting-time-finder.schema';

/**
 * Meeting Time Finder — pure computation kernel.
 *
 * Given a date in an "anchor" time zone and a list of participants (each with
 * an IANA zone + working-hours window), generates a grid of half-hourly slots
 * across a 48h span centred on the anchor day, marks each participant's
 * availability per slot, and groups consecutive full-overlap slots into
 * meeting windows.
 *
 * All math is anchored to UTC instants to remain DST-safe.
 */

export interface Participant {
  zone: string;
  label?: string;
  /** "HH:MM" inclusive start of working hours in the participant's local zone. */
  startTime: string;
  /** "HH:MM" exclusive end of working hours (e.g. 17:00 means up to but not including 17:00). */
  endTime: string;
  /** When true, Saturday & Sunday count as workdays for this participant. */
  includeWeekends?: boolean;
}

export interface FindOverlapInput {
  date: string;
  anchorZone: string;
  participants: readonly Participant[];
  stepMinutes?: number;
}

export interface ParticipantSlotView {
  zone: string;
  date: string;
  time: string;
  offsetLabel: string;
  abbreviation: string;
  weekday: string;
  isWorking: boolean;
}

export interface MeetingSlot {
  utcIso: string;
  startMinutes: number;
  perParticipant: ParticipantSlotView[];
  overlapCount: number;
  isFullOverlap: boolean;
}

export interface MeetingWindow {
  startUtcIso: string;
  endUtcIso: string;
  durationMinutes: number;
  perParticipant: {
    zone: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }[];
}

export interface FindOverlapOutput {
  slots: MeetingSlot[];
  fullOverlapWindows: MeetingWindow[];
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

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

function parseHM(text: string): number | null {
  const m = TIME_RE.exec(text);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

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

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const m = Math.abs(minutes);
  return `${sign}${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** Convert a wall-clock date+time in a zone to a UTC Date. DST-safe. */
function wallToUtc(date: string, time: string, zone: string): Date | null {
  if (!ISO_DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi, 0);
  const initial = new Date(naive);
  const off1 = zoneOffsetAt(zone, initial);
  const adjusted = new Date(naive - off1 * 60000);
  const off2 = zoneOffsetAt(zone, adjusted);
  if (off1 === off2) return adjusted;
  return new Date(naive - off2 * 60000);
}

function describeInstantInZone(zone: string, instant: Date): ParticipantSlotView {
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
  const tzName = get('timeZoneName');
  const offset = zoneOffsetAt(zone, instant);
  const label = offsetLabel(offset);
  return {
    zone,
    date,
    time,
    weekday: get('weekday'),
    offsetLabel: label,
    abbreviation: tzName && !/^GMT/i.test(tzName) ? tzName : label,
    isWorking: false,
  };
}

function weekdayIndex(weekday: string): number {
  const idx = (SHORT_WEEKDAYS as readonly string[]).indexOf(weekday);
  return idx === -1 ? 1 : idx;
}

function isParticipantWorking(view: ParticipantSlotView, participant: Participant): boolean {
  const start = parseHM(participant.startTime);
  const end = parseHM(participant.endTime);
  if (start == null || end == null) return false;
  const dow = weekdayIndex(view.weekday);
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend && !participant.includeWeekends) return false;
  const m = parseHM(view.time);
  if (m == null) return false;
  // Wrapping window (overnight shift e.g. 22:00 → 06:00) supported.
  if (end > start) return m >= start && m < end;
  if (end < start) return m >= start || m < end;
  return false;
}

/**
 * Compute meeting slots and full-overlap windows.
 * The grid spans 48 hours starting at 00:00 of the previous day in the anchor
 * zone — this captures wraparound for distant time zones around the chosen
 * date without surprising the user.
 */
export function findOverlap(input: FindOverlapInput): FindOverlapOutput {
  const stepMinutes = Math.max(5, Math.min(120, Math.round(input.stepMinutes ?? 30)));
  if (!isValidIanaZone(input.anchorZone)) {
    return { slots: [], fullOverlapWindows: [] };
  }
  const validParticipants = input.participants.filter(
    (p) => isValidIanaZone(p.zone) && parseHM(p.startTime) != null && parseHM(p.endTime) != null,
  );
  if (validParticipants.length === 0) {
    return { slots: [], fullOverlapWindows: [] };
  }

  // Window: previous day 00:00 → next day 00:00 in anchor zone (48h total).
  const [y, mo, d] = input.date.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return { slots: [], fullOverlapWindows: [] };
  }
  const previousDay = new Date(Date.UTC(y, mo - 1, d - 1));
  const startDate = `${previousDay.getUTCFullYear()}-${pad2(previousDay.getUTCMonth() + 1)}-${pad2(
    previousDay.getUTCDate(),
  )}`;
  const startInstant = wallToUtc(startDate, '00:00', input.anchorZone);
  if (!startInstant) return { slots: [], fullOverlapWindows: [] };

  const totalMinutes = 48 * 60;
  const slots: MeetingSlot[] = [];
  for (let m = 0; m < totalMinutes; m += stepMinutes) {
    const instant = new Date(startInstant.getTime() + m * 60000);
    const perParticipant = validParticipants.map((p) => {
      const view = describeInstantInZone(p.zone, instant);
      view.isWorking = isParticipantWorking(view, p);
      return view;
    });
    const overlapCount = perParticipant.filter((v) => v.isWorking).length;
    slots.push({
      utcIso: `${instant.toISOString().slice(0, 19)}Z`,
      startMinutes: m,
      perParticipant,
      overlapCount,
      isFullOverlap: overlapCount === validParticipants.length,
    });
  }

  // Group consecutive full-overlap slots into windows.
  const windows: MeetingWindow[] = [];
  let runStart: number | null = null;
  for (let i = 0; i <= slots.length; i++) {
    const slot = slots[i];
    const isOverlap = !!slot && slot.isFullOverlap;
    if (isOverlap && runStart === null) runStart = i;
    else if (!isOverlap && runStart !== null) {
      const startSlot = slots[runStart];
      const endSlot = slots[i - 1];
      const startInst = new Date(startInstant.getTime() + startSlot.startMinutes * 60000);
      const endInst = new Date(
        startInstant.getTime() + (endSlot.startMinutes + stepMinutes) * 60000,
      );
      const durationMinutes = endSlot.startMinutes + stepMinutes - startSlot.startMinutes;
      windows.push({
        startUtcIso: `${startInst.toISOString().slice(0, 19)}Z`,
        endUtcIso: `${endInst.toISOString().slice(0, 19)}Z`,
        durationMinutes,
        perParticipant: validParticipants.map((p) => {
          const startView = describeInstantInZone(p.zone, startInst);
          const endView = describeInstantInZone(p.zone, endInst);
          return {
            zone: p.zone,
            startDate: startView.date,
            startTime: startView.time,
            endDate: endView.date,
            endTime: endView.time,
          };
        }),
      });
      runStart = null;
    }
  }

  return { slots, fullOverlapWindows: windows };
}

export function detectLocalZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function listSupportedZones(): string[] {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      return intlAny.supportedValuesOf('timeZone').slice().sort((a, b) => a.localeCompare(b));
    } catch {
      /* ignore */
    }
  }
  return CURATED_ZONES.slice().sort((a, b) => a.localeCompare(b));
}

export const CURATED_ZONES: readonly string[] = Object.freeze([
  'UTC',
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
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
]);

export function todayIsoInZone(zone: string): string {
  const safe = isValidIanaZone(zone) ? zone : 'UTC';
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: safe,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return findOverlap(input);
}
