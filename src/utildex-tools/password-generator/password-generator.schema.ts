import { z } from 'zod';

export const schema = {
  input: z.object({
    length: z.number(),
    useUppercase: z.boolean(),
    useLowercase: z.boolean(),
    useNumbers: z.boolean(),
    useSymbols: z.boolean(),
  }),
  output: z.object({
    password: z.string(),
    score: z.number(),
  }),
} as const;
