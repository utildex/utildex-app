import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const unit = z.enum(['days', 'weeks', 'months']);
const direction = z.enum(['add', 'subtract']);

export const schema = {
  input: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('add'),
      date: isoDate,
      amount: z.number().int(),
      unit,
      direction,
    }),
    z.object({
      mode: z.literal('business'),
      date: isoDate,
      amount: z.number().int(),
      direction,
    }),
    z.object({
      mode: z.literal('between'),
      start: isoDate,
      end: isoDate,
    }),
    z.object({
      mode: z.literal('deadline'),
      start: isoDate,
      amount: z.number().int(),
      unit: z.enum(['days', 'weeks', 'months', 'business-days']),
    }),
  ]),
  output: z.object({
    iso: z.string().nullable().optional(),
    totalDays: z.number().nullable().optional(),
    years: z.number().nullable().optional(),
    months: z.number().nullable().optional(),
    days: z.number().nullable().optional(),
    businessDays: z.number().nullable().optional(),
  }),
} as const;
