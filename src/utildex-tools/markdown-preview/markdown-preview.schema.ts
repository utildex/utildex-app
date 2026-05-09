import { z } from 'zod';

export const schema = {
  input: z.string(),
  output: z.object({
    html: z.string(),
  }),
} as const;
