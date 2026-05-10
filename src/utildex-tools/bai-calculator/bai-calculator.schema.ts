import { z } from 'zod';

export const schema = {
  input: z.object({
    hip: z.number(),
    hipUnit: z.enum(['cm', 'in']),
    height: z.number(),
    heightUnit: z.enum(['cm', 'in']),
  }),
  output: z.object({
    bai: z.number().nullable(),
    hipCm: z.number().nullable(),
    heightMeters: z.number().nullable(),
  }),
} as const;
