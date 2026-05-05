import { z } from 'zod';

export const schema = {
  input: z.object({
    amount: z.number(),
    from: z.string(),
    to: z.string(),
    type: z.enum(['length', 'weight', 'temp']),
  }),
  output: z.object({
    result: z.number(),
  }),
} as const;
