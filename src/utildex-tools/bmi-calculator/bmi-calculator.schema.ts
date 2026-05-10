import { z } from 'zod';

export const schema = {
  input: z.object({
    height: z.number(),
    heightUnit: z.enum(['cm', 'in']),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lb']),
  }),
  output: z.object({
    bmi: z.number().nullable(),
    heightMeters: z.number().nullable(),
    weightKg: z.number().nullable(),
  }),
} as const;
