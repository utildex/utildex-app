import { z } from 'zod';

export const schema = {
  input: z.string(),
  output: z.object({
    success: z.boolean(),
    dataUrl: z.string(),
    error: z.string().nullable(),
  }),
} as const;
