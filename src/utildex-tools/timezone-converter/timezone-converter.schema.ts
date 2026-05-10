import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const convertedZone = z.object({
  zone: z.string(),
  date: z.string(),
  time: z.string(),
  dayDelta: z.number().int(),
  weekday: z.string(),
  offsetMinutes: z.number().int(),
  offsetLabel: z.string(),
  abbreviation: z.string(),
});

export const schema = {
  input: z.object({
    date: isoDate,
    time: time24,
    sourceZone: z.string().min(1),
    targets: z.array(z.string().min(1)),
  }),
  output: z.object({
    utcIso: z.string().nullable(),
    source: convertedZone.nullable(),
    targets: z.array(convertedZone),
  }),
} as const;
