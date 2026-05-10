import { z } from 'zod';

const epochUnit = z.enum(['s', 'ms', 'us', 'ns']);

const formatted = z.object({
  epochSeconds: z.number(),
  epochMilliseconds: z.number(),
  epochMicroseconds: z.string(), // string to safely carry past Number.MAX_SAFE_INTEGER
  epochNanoseconds: z.string(),
  utcIso: z.string(),
  utcDate: z.string(),
  utcTime: z.string(),
  localDate: z.string(),
  localTime: z.string(),
  zoneDate: z.string(),
  zoneTime: z.string(),
  zone: z.string(),
  offsetLabel: z.string(),
  weekday: z.string(),
  relative: z.string(),
});

export const schema = {
  input: z.object({
    /** Direction. 'parse' = parse a numeric/string timestamp; 'compose' = build from a date+time. */
    mode: z.enum(['parse', 'compose']),
    /** For 'parse': the raw timestamp string (digits only, optional sign). */
    raw: z.string().optional(),
    /** For 'parse': the unit of the supplied timestamp. 'auto' detects by magnitude. */
    unit: z.union([epochUnit, z.literal('auto')]).optional(),
    /** For 'compose': ISO date YYYY-MM-DD. */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** For 'compose': time HH:MM or HH:MM:SS. */
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .optional(),
    /** For 'compose': IANA time zone the supplied wall-clock time is in. */
    zone: z.string().optional(),
  }),
  output: z.object({
    valid: z.boolean(),
    detectedUnit: epochUnit.nullable(),
    formatted: formatted.nullable(),
  }),
} as const;
