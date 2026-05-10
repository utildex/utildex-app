import { z } from 'zod';

const detectedFormat = z.enum([
  'iso8601',
  'rfc3339',
  'rfc2822',
  'unix-s',
  'unix-ms',
  'sql-datetime',
  'sql-date',
  'http-date',
  'locale',
  'unknown',
]);

const formattedTime = z.object({
  iso8601Utc: z.string(),
  iso8601Local: z.string(),
  rfc3339: z.string(),
  rfc2822: z.string(),
  httpDate: z.string(),
  unixSeconds: z.number(),
  unixMilliseconds: z.number(),
  sqlDateTimeUtc: z.string(),
  sqlDateTimeLocal: z.string(),
  sqlDate: z.string(),
  localeShort: z.string(),
  localeLong: z.string(),
  zone: z.string(),
  offsetLabel: z.string(),
});

export const schema = {
  input: z.object({
    raw: z.string(),
    /** IANA zone used for "local"/"selected zone" outputs and for parsing format that lacks an offset (e.g. SQL DATETIME). */
    zone: z.string().optional(),
    /** Locale for the localized formatters. */
    locale: z.string().optional(),
  }),
  output: z.object({
    valid: z.boolean(),
    detectedFormat,
    instantMs: z.number().nullable(),
    formatted: formattedTime.nullable(),
  }),
} as const;
