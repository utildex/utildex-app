import { z } from 'zod';

export const schema = {
  input: z.object({
    count: z.number(),
    startWithLorem: z.boolean(),
  }),
  output: z.object({
    paragraphs: z.array(z.string()),
  }),
} as const;
