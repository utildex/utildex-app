import { z } from 'zod';

export const schema = {
  input: z.object({
    rawHash: z.string(),
    uppercase: z.boolean(),
  }),
  output: z.object({
    hash: z.string(),
  }),
} as const;
