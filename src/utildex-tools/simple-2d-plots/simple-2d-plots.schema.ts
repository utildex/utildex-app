import { z } from 'zod';

export const schema = {
  input: z.object({
    preset: z.enum(['single', 'multi', 'styled']),
    dataJson: z.string(),
    styleJson: z.string().optional(),
  }),
  output: z.object({
    ok: z.boolean(),
    normalizedDataJson: z.string().nullable(),
    normalizedStyleJson: z.string().nullable(),
    error: z.string().nullable(),
  }),
} as const;
