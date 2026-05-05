import { z } from 'zod';

export const schema = {
  input: z.object({
    changes: z.array(
      z.object({
        value: z.string(),
        added: z.boolean().optional(),
        removed: z.boolean().optional(),
      }),
    ),
    mode: z.enum(['Chars', 'Words', 'Lines']),
  }),
  output: z.object({
    rows: z.array(
      z.object({
        type: z.enum(['added', 'removed', 'unchanged', 'header']),
        content: z.string(),
        oldLine: z.number().optional(),
        newLine: z.number().optional(),
      }),
    ),
    stats: z.object({
      additions: z.number(),
      deletions: z.number(),
      changes: z.number(),
    }),
  }),
} as const;
