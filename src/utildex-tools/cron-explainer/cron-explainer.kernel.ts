import type { z } from 'zod';
import { schema } from './cron-explainer.schema';

/**
 * Cron Expression Explainer — pure parser, validator, describer and next-run
 * iterator. Supports classic 5-field cron with optional 6-field (seconds-first)
 * and 7-field (year-last) variants used by Quartz/AWS:
 *
 *     ┌── seconds      (optional, 0-59)
 *     │ ┌── minutes    (0-59)
 *     │ │ ┌── hours    (0-23)
 *     │ │ │ ┌── day-of-month (1-31)
 *     │ │ │ │ ┌── month (1-12 or JAN-DEC)
 *     │ │ │ │ │ ┌── day-of-week (0-7, SUN-SAT; 0 and 7 = Sunday)
 *     │ │ │ │ │ │ ┌── year (optional, 1970-2099)
 *     * * * * * * *
 *
 * Supported syntax:
 *  - `*`            → wildcard
 *  - `a,b,c`        → list
 *  - `a-b`          → range
 *  - `a-b/n`, `* /n` → step
 *  - JAN..DEC, SUN..SAT (case-insensitive) for month/day-of-week
 *  - `?`            → equivalent to `*` for day-of-month / day-of-week
 *  - Macros: @yearly @annually @monthly @weekly @daily @midnight @hourly
 *
 * Not supported (intentionally — uncommon, ambiguous): `L`, `W`, `#`, `@reboot`.
 *
 * Next-run iteration walks the calendar in the user's IANA zone using
 * `Intl.DateTimeFormat` to recover wall-clock parts and a wall→UTC round-trip
 * to handle DST transitions.
 */

export type ConvertInput = z.infer<typeof schema.input>;
export type ConvertOutput = z.infer<typeof schema.output>;
export type CronField = NonNullable<z.infer<typeof schema.output.shape.parts>>['minutes'];
export type CronParts = NonNullable<z.infer<typeof schema.output.shape.parts>>;

export interface DescribeLabels {
  everySecond: string;
  everyMinute: string;
  everyHour: string;
  everyDay: string;
  atTime: (time: string) => string;
  atSecond: (s: string) => string;
  pastEveryHour: string;
  pastHour: (hours: string) => string;
  everyXMinutes: (n: number) => string;
  everyXHours: (n: number) => string;
  everyXSeconds: (n: number) => string;
  onMonths: (months: string) => string;
  everyMonth: string;
  onDaysOfMonth: (days: string) => string;
  everyDayOfMonth: string;
  onDaysOfWeek: (days: string) => string;
  inYears: (years: string) => string;
  monthsShort: string[]; // length 12, Jan..Dec
  daysShort: string[]; // length 7,  Sun..Sat
  and: string;
  through: string;
}

interface FieldSpec {
  min: number;
  max: number;
  names?: Record<string, number>;
  allowQuestion?: boolean;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const DOW_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const SECONDS_SPEC: FieldSpec = { min: 0, max: 59 };
const MINUTES_SPEC: FieldSpec = { min: 0, max: 59 };
const HOURS_SPEC: FieldSpec = { min: 0, max: 23 };
const DOM_SPEC: FieldSpec = { min: 1, max: 31, allowQuestion: true };
const MONTH_SPEC: FieldSpec = { min: 1, max: 12, names: MONTH_NAMES };
const DOW_SPEC: FieldSpec = { min: 0, max: 6, names: DOW_NAMES, allowQuestion: true };
const YEAR_SPEC: FieldSpec = { min: 1970, max: 2099 };

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

function resolveMacro(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  return MACROS[lower] ?? trimmed;
}

function parseAtom(atom: string, spec: FieldSpec): number | null {
  const lower = atom.toLowerCase();
  if (spec.names && lower in spec.names) return spec.names[lower];
  if (!/^\d+$/.test(atom)) return null;
  const n = Number(atom);
  if (!Number.isInteger(n)) return null;
  return n;
}

function parseField(raw: string, spec: FieldSpec): CronField {
  const trimmed = raw.trim();
  if (trimmed === '?' && spec.allowQuestion) {
    return wildcardField(spec);
  }
  if (trimmed === '*') {
    return wildcardField(spec);
  }
  const segments = trimmed.split(',');
  const set = new Set<number>();
  for (const seg of segments) {
    const stepIdx = seg.indexOf('/');
    let rangePart = seg;
    let step = 1;
    if (stepIdx >= 0) {
      const stepStr = seg.slice(stepIdx + 1);
      step = Number(stepStr);
      if (!Number.isInteger(step) || step < 1) {
        throw new Error(`Invalid step "${stepStr}" in field "${raw}"`);
      }
      rangePart = seg.slice(0, stepIdx);
    }
    let lo: number;
    let hi: number;
    if (rangePart === '*' || rangePart === '') {
      lo = spec.min;
      hi = spec.max;
    } else {
      const dash = rangePart.indexOf('-');
      if (dash >= 0) {
        const loRaw = rangePart.slice(0, dash);
        const hiRaw = rangePart.slice(dash + 1);
        const loV = parseAtom(loRaw, spec);
        const hiV = parseAtom(hiRaw, spec);
        if (loV == null || hiV == null) {
          throw new Error(`Invalid range "${rangePart}" in field "${raw}"`);
        }
        lo = loV;
        hi = hiV;
      } else {
        const v = parseAtom(rangePart, spec);
        if (v == null) throw new Error(`Invalid value "${rangePart}" in field "${raw}"`);
        lo = v;
        hi = stepIdx >= 0 ? spec.max : v;
      }
    }
    if (lo < spec.min || hi > spec.max || lo > hi) {
      throw new Error(`Range ${lo}-${hi} out of bounds [${spec.min},${spec.max}] in "${raw}"`);
    }
    for (let v = lo; v <= hi; v += step) set.add(v);
  }
  const values = Array.from(set).sort((a, b) => a - b);
  return {
    raw: trimmed,
    values,
    isWildcard: values.length === spec.max - spec.min + 1,
  };
}

function wildcardField(spec: FieldSpec): CronField {
  const values: number[] = [];
  for (let v = spec.min; v <= spec.max; v += 1) values.push(v);
  return { raw: '*', values, isWildcard: true };
}

function tokenize(expr: string): string[] {
  return expr.trim().split(/\s+/);
}

export interface ParseResult {
  parts: CronParts;
  normalized: string;
  hasSeconds: boolean;
  hasYear: boolean;
}

export function parseCron(input: string): ParseResult {
  const expanded = resolveMacro(input);
  const tokens = tokenize(expanded);
  if (tokens.length < 5 || tokens.length > 7) {
    throw new Error(`Expected 5, 6, or 7 fields; got ${tokens.length} in "${input}"`);
  }
  let secondsRaw: string | null = null;
  let yearRaw: string | null = null;
  let core: string[];
  if (tokens.length === 5) {
    core = tokens;
  } else if (tokens.length === 6) {
    // Heuristic: if the first token contains seconds-only syntax (single
    // number 0-59 or ranges within [0,59]) and the second-to-last looks like
    // a day-of-week field, treat as seconds-leading.
    // To stay deterministic, prefer seconds-leading (Quartz/standard).
    secondsRaw = tokens[0];
    core = tokens.slice(1);
  } else {
    secondsRaw = tokens[0];
    core = tokens.slice(1, 6);
    yearRaw = tokens[6];
  }
  const [minRaw, hourRaw, domRaw, monRaw, dowRaw] = core;
  const seconds = secondsRaw != null ? parseField(secondsRaw, SECONDS_SPEC) : null;
  const minutes = parseField(minRaw, MINUTES_SPEC);
  const hours = parseField(hourRaw, HOURS_SPEC);
  const dayOfMonth = parseField(domRaw, DOM_SPEC);
  const month = parseField(monRaw, MONTH_SPEC);
  const dowParsed = parseField(dowRaw, DOW_SPEC);
  // Normalize Sunday=7 to 0.
  if (dowParsed.values.includes(7)) {
    const set = new Set(dowParsed.values);
    set.delete(7);
    set.add(0);
    dowParsed.values = Array.from(set).sort((a, b) => a - b);
  }
  const year = yearRaw != null ? parseField(yearRaw, YEAR_SPEC) : null;
  const normalized = [
    seconds?.raw ?? null,
    minutes.raw,
    hours.raw,
    dayOfMonth.raw,
    month.raw,
    dowParsed.raw,
    year?.raw ?? null,
  ]
    .filter((v): v is string => v != null)
    .join(' ');
  return {
    parts: { seconds, minutes, hours, dayOfMonth, month, dayOfWeek: dowParsed, year },
    normalized,
    hasSeconds: seconds != null,
    hasYear: year != null,
  };
}

// ---------- Description ----------

function joinList(values: string[], and: string): string {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} ${and} ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} ${and} ${values[values.length - 1]}`;
}

function describeNumericList(values: number[], pad: (n: number) => string): string {
  // Compress contiguous ranges.
  const groups: string[] = [];
  let i = 0;
  while (i < values.length) {
    let j = i;
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j += 1;
    if (j === i) groups.push(pad(values[i]));
    else groups.push(`${pad(values[i])}–${pad(values[j])}`);
    i = j + 1;
  }
  return groups.join(', ');
}

function detectStep(values: number[], min: number, max: number): number | null {
  if (values.length < 2) return null;
  const step = values[1] - values[0];
  if (step < 2) return null;
  if (values[0] !== min) return null;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] - values[i - 1] !== step) return null;
  }
  if (values[values.length - 1] + step <= max) return null;
  return step;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function describe(parts: CronParts, labels: DescribeLabels): string {
  const phrases: string[] = [];

  // Time-of-day phrase.
  const m = parts.minutes;
  const h = parts.hours;
  const s = parts.seconds;

  // Determine "every X seconds" simple shape.
  if (s && !s.isWildcard) {
    const step = detectStep(s.values, 0, 59);
    if (step != null) {
      phrases.push(labels.everyXSeconds(step));
    } else {
      phrases.push(labels.atSecond(describeNumericList(s.values, pad2)));
    }
  } else if (s) {
    phrases.push(labels.everySecond);
  }

  if (m.isWildcard && h.isWildcard) {
    if (!s || s.isWildcard) phrases.push(labels.everyMinute);
  } else if (m.isWildcard && !h.isWildcard) {
    // Every minute past listed hours.
    const hrs = describeNumericList(h.values, pad2);
    phrases.push(labels.pastHour(hrs));
  } else if (!m.isWildcard && h.isWildcard) {
    const stepM = detectStep(m.values, 0, 59);
    if (stepM != null) phrases.push(labels.everyXMinutes(stepM));
    else phrases.push(labels.pastEveryHour + ' (' + describeNumericList(m.values, pad2) + ')');
  } else {
    // Both fixed → list of HH:MM times.
    const times: string[] = [];
    for (const hv of h.values) {
      for (const mv of m.values) {
        times.push(`${pad2(hv)}:${pad2(mv)}`);
      }
    }
    if (times.length <= 6) {
      phrases.push(labels.atTime(joinList(times, labels.and)));
    } else {
      phrases.push(labels.atTime(`${times[0]}…${times[times.length - 1]} (${times.length}×)`));
    }
  }

  // Day-of-month / day-of-week.
  const dom = parts.dayOfMonth;
  const dow = parts.dayOfWeek;
  if (!dom.isWildcard) {
    phrases.push(labels.onDaysOfMonth(describeNumericList(dom.values, (n) => String(n))));
  }
  if (!dow.isWildcard) {
    const names = dow.values.map((v) => labels.daysShort[v] ?? String(v));
    phrases.push(labels.onDaysOfWeek(joinList(names, labels.and)));
  }

  // Month.
  const mon = parts.month;
  if (!mon.isWildcard) {
    const names = mon.values.map((v) => labels.monthsShort[v - 1] ?? String(v));
    phrases.push(labels.onMonths(joinList(names, labels.and)));
  }

  // Year.
  if (parts.year && !parts.year.isWildcard) {
    phrases.push(labels.inYears(describeNumericList(parts.year.values, (n) => String(n))));
  }

  return phrases.join(', ');
}

// ---------- Next runs ----------

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

function wallToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  zone: string,
): number {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s, 0);
  const off1 = zoneOffsetAt(zone, naive);
  const adjusted = naive - off1 * 60000;
  const off2 = zoneOffsetAt(zone, adjusted);
  return off1 === off2 ? adjusted : naive - off2 * 60000;
}

function describeWall(zone: string, instantMs: number) {
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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dayOfWeekUtc(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function nextValue(values: number[], current: number): number | null {
  for (const v of values) if (v >= current) return v;
  return null;
}

interface IteratorState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Advance `state` to the next instant matching the cron `parts` (in `zone`).
 * Returns the wall-clock state, or null if no future match exists in range.
 *
 * Algorithm: classic "increment-and-check", using the constraint:
 *  - If both DOM and DOW are restricted (neither wildcard), match if EITHER
 *    matches (Vixie cron semantics — the OR rule).
 *  - If only one is restricted, that one must match.
 */
function findNextMatch(
  parts: CronParts,
  state: IteratorState,
  hasSeconds: boolean,
): IteratorState | null {
  const yearValues = parts.year ? parts.year.values : null;
  const yearMin = yearValues ? yearValues[0] : 1970;
  const yearMax = yearValues ? yearValues[yearValues.length - 1] : 2099;
  const domBoth = !parts.dayOfMonth.isWildcard && !parts.dayOfWeek.isWildcard;

  // Hard iteration cap to avoid infinite loops on impossible expressions
  // (e.g. `0 0 31 2 *` never matches).
  for (let safety = 0; safety < 4 * 366 * 24 * 60; safety += 1) {
    if (state.year > yearMax) return null;
    if (yearValues) {
      const ny = nextValue(yearValues, state.year);
      if (ny == null) return null;
      if (ny !== state.year) {
        state.year = ny;
        state.month = 1;
        state.day = 1;
        state.hour = 0;
        state.minute = 0;
        state.second = 0;
      }
    }
    if (state.year < yearMin) {
      state.year = yearMin;
      state.month = 1;
      state.day = 1;
      state.hour = 0;
      state.minute = 0;
      state.second = 0;
    }
    const nm = nextValue(parts.month.values, state.month);
    if (nm == null) {
      state.year += 1;
      state.month = 1;
      state.day = 1;
      state.hour = 0;
      state.minute = 0;
      state.second = 0;
      continue;
    }
    if (nm !== state.month) {
      state.month = nm;
      state.day = 1;
      state.hour = 0;
      state.minute = 0;
      state.second = 0;
    }

    // Day matching.
    const dim = daysInMonth(state.year, state.month);
    let foundDay = false;
    for (let d = state.day; d <= dim; d += 1) {
      const domMatches = parts.dayOfMonth.values.includes(d);
      const dowMatches = parts.dayOfWeek.values.includes(dayOfWeekUtc(state.year, state.month, d));
      const ok = domBoth ? domMatches || dowMatches : domMatches && dowMatches;
      if (ok) {
        if (d !== state.day) {
          state.day = d;
          state.hour = 0;
          state.minute = 0;
          state.second = 0;
        }
        foundDay = true;
        break;
      }
    }
    if (!foundDay) {
      state.month += 1;
      state.day = 1;
      state.hour = 0;
      state.minute = 0;
      state.second = 0;
      if (state.month > 12) {
        state.year += 1;
        state.month = 1;
      }
      continue;
    }

    const nh = nextValue(parts.hours.values, state.hour);
    if (nh == null) {
      state.day += 1;
      state.hour = 0;
      state.minute = 0;
      state.second = 0;
      continue;
    }
    if (nh !== state.hour) {
      state.hour = nh;
      state.minute = 0;
      state.second = 0;
    }
    const nmi = nextValue(parts.minutes.values, state.minute);
    if (nmi == null) {
      state.hour += 1;
      state.minute = 0;
      state.second = 0;
      continue;
    }
    if (nmi !== state.minute) {
      state.minute = nmi;
      state.second = 0;
    }
    if (hasSeconds && parts.seconds) {
      const ns = nextValue(parts.seconds.values, state.second);
      if (ns == null) {
        state.minute += 1;
        state.second = 0;
        continue;
      }
      state.second = ns;
    } else {
      state.second = 0;
    }
    return { ...state };
  }
  return null;
}

export function nextRuns(
  parts: CronParts,
  zone: string,
  fromMs: number,
  count: number,
  hasSeconds: boolean,
): number[] {
  const out: number[] = [];
  // Start one second after the reference instant in the local zone.
  const startWall = describeWall(zone, fromMs + 1000);
  const state: IteratorState = {
    year: startWall.year,
    month: startWall.month,
    day: startWall.day,
    hour: startWall.hour,
    minute: startWall.minute,
    second: hasSeconds ? startWall.second : 0,
  };
  for (let i = 0; i < count; i += 1) {
    const match = findNextMatch(parts, state, hasSeconds);
    if (!match) break;
    const instant = wallToUtc(
      match.year,
      match.month,
      match.day,
      match.hour,
      match.minute,
      match.second,
      zone,
    );
    out.push(instant);
    // Advance by one second to avoid re-matching the same instant.
    if (hasSeconds) {
      state.second = match.second + 1;
      if (state.second > 59) {
        state.second = 0;
        state.minute += 1;
      }
    } else {
      state.minute = match.minute + 1;
      state.second = 0;
      if (state.minute > 59) {
        state.minute = 0;
        state.hour += 1;
      }
    }
  }
  return out;
}

// ---------- Public API ----------

const ENGLISH_LABELS: DescribeLabels = {
  everySecond: 'every second',
  everyMinute: 'every minute',
  everyHour: 'every hour',
  everyDay: 'every day',
  atTime: (time) => `at ${time}`,
  atSecond: (s) => `at second ${s}`,
  pastEveryHour: 'every minute past every hour',
  pastHour: (hours) => `every minute past hour ${hours}`,
  everyXMinutes: (n) => `every ${n} minutes`,
  everyXHours: (n) => `every ${n} hours`,
  everyXSeconds: (n) => `every ${n} seconds`,
  onMonths: (months) => `in ${months}`,
  everyMonth: 'every month',
  onDaysOfMonth: (days) => `on day ${days} of the month`,
  everyDayOfMonth: 'every day of the month',
  onDaysOfWeek: (days) => `on ${days}`,
  inYears: (years) => `in ${years}`,
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  and: 'and',
  through: 'through',
};

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

function relativeLabel(deltaMs: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const sec = Math.round(deltaMs / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(sec / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(sec / (86400 * 30)), 'month');
  return rtf.format(Math.round(sec / (86400 * 365)), 'year');
}

export function convert(input: ConvertInput): ConvertOutput {
  const zone = isValidIanaZone(input.zone ?? '') ? (input.zone as string) : detectLocalZone();
  const locale = (input.locale && input.locale.trim()) || 'en-US';
  const count = input.count ?? 5;
  const fromMs = input.fromMs ?? Date.now();
  let parsed: ParseResult;
  try {
    parsed = parseCron(input.expression);
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : String(e),
      normalized: null,
      description: null,
      parts: null,
      nextRuns: [],
    };
  }
  const description = describe(parsed.parts, ENGLISH_LABELS);
  const upcoming = nextRuns(parsed.parts, zone, fromMs, count, parsed.hasSeconds);
  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    dateStyle: 'medium',
    timeStyle: parsed.hasSeconds ? 'medium' : 'short',
  });
  const nextRunOutputs = upcoming.map((instantMs) => ({
    instantMs,
    localLabel: fmt.format(new Date(instantMs)),
    relative: relativeLabel(instantMs - fromMs, locale),
  }));
  return {
    valid: true,
    error: null,
    normalized: parsed.normalized,
    description,
    parts: parsed.parts,
    nextRuns: nextRunOutputs,
  };
}

export function run(input: ConvertInput): ConvertOutput {
  return convert(input);
}
