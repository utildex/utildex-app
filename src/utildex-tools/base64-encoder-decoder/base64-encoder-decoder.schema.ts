import { z } from 'zod';

export const schema = {
  input: z.object({
    mode: z.enum(['encode', 'decode']),
    input: z.string(),
    urlSafe: z.boolean().optional(),
  }),
  output: z.object({
    value: z.string(),
    error: z.string().nullable(),
  }),
} as const;
