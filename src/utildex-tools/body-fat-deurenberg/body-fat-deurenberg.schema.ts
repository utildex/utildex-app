import { z } from 'zod';

export const schema = {
  input: z.object({
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lb']),
    height: z.number(),
    heightUnit: z.enum(['cm', 'in']),
    sex: z.enum(['female', 'male']),
    age: z.number(),
  }),
  output: z.object({
    bodyFatPercent: z.number().nullable(),
    bmi: z.number().nullable(),
    fatMassKg: z.number().nullable(),
    leanMassKg: z.number().nullable(),
  }),
} as const;
