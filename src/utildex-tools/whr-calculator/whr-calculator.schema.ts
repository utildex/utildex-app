import { z } from 'zod';

export const schema = {
  input: z.object({
    waist: z.number(),
    hip: z.number(),
    unit: z.enum(['cm', 'in']),
  }),
  output: z.object({
    whr: z.number().nullable(),
    waistCm: z.number().nullable(),
    hipCm: z.number().nullable(),
  }),
} as const;
