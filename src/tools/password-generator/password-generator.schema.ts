import { z } from 'zod';

export const schema = {
  input: z.object({
    length: z.number(),
    useUppercase: z.boolean(),
    useLowercase: z.boolean(),
    useNumbers: z.boolean(),
    useSymbols: z.boolean(),
    rng: z.any().optional(),
  }),
  output: z.object({
    password: z.string(),
    score: z.number(),
  }),
} as const;
