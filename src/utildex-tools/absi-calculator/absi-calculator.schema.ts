import { z } from 'zod';

export const schema = {
  input: z.object({
    waist: z.number(),
    waistUnit: z.enum(['cm', 'in']),
    height: z.number(),
    heightUnit: z.enum(['cm', 'in']),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lb']),
    sex: z.enum(['female', 'male']),
    age: z.number(),
  }),
  output: z.object({
    absi: z.number().nullable(),
    absiZ: z.number().nullable(),
    bmi: z.number().nullable(),
  }),
} as const;
