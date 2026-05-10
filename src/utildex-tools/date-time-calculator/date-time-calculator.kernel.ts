import type { z } from 'zod';
import { schema } from './date-time-calculator.schema';

/**
 * Date & Time Calculator — pure computation kernel.
 *
 * All operations work on calendar dates (no time-of-day) and are time-zone
 * safe by serializing everything as UTC ISO date strings (YYYY-MM-DD). Inputs
 * are parsed as UTC midnight to avoid local DST drift between calls.
 */

export type Mode = 'add' | 'business' | 'between' | 'deadline';
export type Unit = 'days' | 'weeks' | 'months';
export type Direction = 'add' | 'subtract';

export interface AddInput {
  date: string; // YYYY-MM-DD
  amount: number;
  unit: Unit;
  direction: Direction;
}

export interface BusinessInput {
  date: string;
  amount: number;
  direction: Direction;
}

export interface BetweenInput {
  start: string;
  end: string;
}

export interface DeadlineInput {
  start: string;
  amount: number;
  unit: Unit | 'business-days';
}

export interface DiffParts {
  totalDays: number;
  totalWeeks: number;
  years: number;
  months: number;
  days: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const [y, m, d] = value.split('-').map((n) => Number(n));
  // Construct in UTC to keep arithmetic time-zone-independent.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

export function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as a UTC ISO date string. */
export function todayIso(): string {
  const now = new Date();
  return formatIsoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/* -------------------------------------------------------------------------- */
/* User-selectable date format helpers                                        */
/* -------------------------------------------------------------------------- */

export type DateFormat = 'iso' | 'dmy' | 'mdy' | 'long';

const DATE_SEPARATORS = /[\/\-.]/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function makeIsoFromParts(y: number, m: number, d: number): string | null {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return formatIsoDate(date);
}

/** Format an ISO date (YYYY-MM-DD) for display in the chosen format. */
export function formatDateForDisplay(iso: string, fmt: DateFormat, locale: string): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  switch (fmt) {
    case 'iso':
      return `${y}-${m}-${day}`;
    case 'dmy':
      return `${day}/${m}/${y}`;
    case 'mdy':
      return `${m}/${day}/${y}`;
    case 'long':
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'long',
          timeZone: 'UTC',
        }).format(d);
      } catch {
        return `${y}-${m}-${day}`;
      }
  }
}

/**
 * Parse a date the user typed in the chosen format. ISO is always accepted as
 * a fallback so machine-readable values still work. Returns an ISO date or
 * null when the value cannot be made into a valid calendar date.
 */
export function parseDisplayDate(text: string, fmt: DateFormat, locale?: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return makeIsoFromParts(y, m, d);
  }

  const parts = trimmed.split(DATE_SEPARATORS).map((p) => Number(p));
  const numericTriple = parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? parts : null;

  if (numericTriple) {
    let y: number;
    let m: number;
    let d: number;
    if (fmt === 'dmy') {
      [d, m, y] = numericTriple;
    } else if (fmt === 'mdy') {
      [m, d, y] = numericTriple;
    } else {
      // iso/long with slash separators: lean on locale to disambiguate.
      const localePrefersDmy = !!locale && !/^en-US/i.test(locale);
      if (localePrefersDmy) {
        [d, m, y] = numericTriple;
      } else {
        [m, d, y] = numericTriple;
      }
    }
    if (y < 100) y += 2000;
    return makeIsoFromParts(y, m, d);
  }

  if (fmt === 'long') {
    const ms = Date.parse(trimmed);
    if (Number.isFinite(ms)) {
      const d = new Date(ms);
      return formatIsoDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
    }
  }
  return null;
}

/** Human placeholder for the chosen format. */
export function placeholderForFormat(fmt: DateFormat): string {
  switch (fmt) {
    case 'iso':
      return 'YYYY-MM-DD';
    case 'dmy':
      return 'DD/MM/YYYY';
    case 'mdy':
      return 'MM/DD/YYYY';
    case 'long':
      return 'YYYY-MM-DD';
  }
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsUtc(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  // Target month and clamp the day to the new month's last day.
  const target = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target;
}

export function addDuration(
  date: Date,
  amount: number,
  unit: Unit,
  direction: Direction = 'add',
): Date {
  const signed = direction === 'subtract' ? -amount : amount;
  switch (unit) {
    case 'days':
      return addDaysUtc(date, signed);
    case 'weeks':
      return addDaysUtc(date, signed * 7);
    case 'months':
      return addMonthsUtc(date, signed);
  }
}

/**
 * Add (or subtract) a number of business days (Mon–Fri only).
 * The starting date itself is never counted; the result is the nth weekday
 * after (or before) it.
 */
export function addBusinessDays(date: Date, amount: number, direction: Direction = 'add'): Date {
  const total = direction === 'subtract' ? -Math.abs(amount) : Math.abs(amount);
  if (total === 0) return new Date(date.getTime());
  const step = total > 0 ? 1 : -1;
  let remaining = Math.abs(total);
  let cursor = new Date(date.getTime());
  while (remaining > 0) {
    cursor = addDaysUtc(cursor, step);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return cursor;
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Inclusive count of business days strictly between start and end (the start
 * itself is not counted; the end day is counted if it is a weekday). When end
 * is before start, the result is negative.
 */
export function businessDaysBetween(start: Date, end: Date): number {
  const totalDays = daysBetween(start, end);
  if (totalDays === 0) return 0;
  const step = totalDays > 0 ? 1 : -1;
  let count = 0;
  let cursor = new Date(start.getTime());
  let remaining = Math.abs(totalDays);
  while (remaining > 0) {
    cursor = addDaysUtc(cursor, step);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) count += step;
    remaining -= 1;
  }
  return count;
}

export function diffParts(start: Date, end: Date): DiffParts {
  const sign = end.getTime() < start.getTime() ? -1 : 1;
  const a = sign === 1 ? start : end;
  const b = sign === 1 ? end : start;

  let years = b.getUTCFullYear() - a.getUTCFullYear();
  let months = b.getUTCMonth() - a.getUTCMonth();
  let days = b.getUTCDate() - a.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = daysBetween(start, end);
  const totalWeeks = Math.trunc(totalDays / 7);

  return {
    totalDays,
    totalWeeks,
    years: years * sign,
    months: months * sign,
    days: days * sign,
  };
}

export interface ComputedResult {
  /** Resulting date (when applicable). */
  date?: Date;
  /** ISO YYYY-MM-DD form of the date result. */
  iso?: string;
  /** Difference parts (when applicable). */
  diff?: DiffParts;
  /** Business-day difference (when applicable). */
  businessDiff?: number;
}

export function computeAdd(input: AddInput): ComputedResult {
  const start = parseIsoDate(input.date);
  if (!start || !Number.isFinite(input.amount)) return {};
  const date = addDuration(start, Math.trunc(input.amount), input.unit, input.direction);
  return { date, iso: formatIsoDate(date) };
}

export function computeBusiness(input: BusinessInput): ComputedResult {
  const start = parseIsoDate(input.date);
  if (!start || !Number.isFinite(input.amount)) return {};
  const date = addBusinessDays(start, Math.trunc(input.amount), input.direction);
  return { date, iso: formatIsoDate(date) };
}

export function computeBetween(input: BetweenInput): ComputedResult {
  const start = parseIsoDate(input.start);
  const end = parseIsoDate(input.end);
  if (!start || !end) return {};
  return {
    diff: diffParts(start, end),
    businessDiff: businessDaysBetween(start, end),
  };
}

export function computeDeadline(input: DeadlineInput): ComputedResult {
  const start = parseIsoDate(input.start);
  if (!start || !Number.isFinite(input.amount)) return {};
  const amount = Math.trunc(input.amount);
  const date =
    input.unit === 'business-days'
      ? addBusinessDays(start, amount, 'add')
      : addDuration(start, amount, input.unit, 'add');
  return { date, iso: formatIsoDate(date) };
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  switch (input.mode) {
    case 'add': {
      const r = computeAdd(input);
      return { iso: r.iso ?? null };
    }
    case 'business': {
      const r = computeBusiness(input);
      return { iso: r.iso ?? null };
    }
    case 'between': {
      const r = computeBetween(input);
      return {
        totalDays: r.diff?.totalDays ?? null,
        years: r.diff?.years ?? null,
        months: r.diff?.months ?? null,
        days: r.diff?.days ?? null,
        businessDays: r.businessDiff ?? null,
      };
    }
    case 'deadline': {
      const r = computeDeadline(input);
      return { iso: r.iso ?? null };
    }
  }
}
