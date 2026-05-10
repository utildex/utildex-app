import { z } from 'zod';

const cronField = z.object({
  raw: z.string(),
  values: z.array(z.number()),
  isWildcard: z.boolean(),
});

const cronParts = z.object({
  seconds: cronField.nullable(),
  minutes: cronField,
  hours: cronField,
  dayOfMonth: cronField,
  month: cronField,
  dayOfWeek: cronField,
  year: cronField.nullable(),
});

export const schema = {
  input: z.object({
    /** Raw cron expression (5-7 fields, supports `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`, `@reboot`). */
    expression: z.string(),
    /** IANA zone used to compute the next runs. */
    zone: z.string().optional(),
    /** Locale used for the natural-language description. */
    locale: z.string().optional(),
    /** How many upcoming runs to compute. Defaults to 5. */
    count: z.number().int().min(1).max(25).optional(),
    /** Reference instant (ms) used as "from" for next runs. Defaults to `Date.now()`. */
    fromMs: z.number().optional(),
  }),
  output: z.object({
    valid: z.boolean(),
    error: z.string().nullable(),
    normalized: z.string().nullable(),
    description: z.string().nullable(),
    parts: cronParts.nullable(),
    nextRuns: z.array(
      z.object({
        instantMs: z.number(),
        localLabel: z.string(),
        relative: z.string(),
      }),
    ),
  }),
} as const;
