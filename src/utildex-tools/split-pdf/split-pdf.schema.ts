import { z } from 'zod';

export const schema = {
  input: z.object({
    sourceBytes: z.string().describe('base64-encoded pdf'),
    groups: z.array(z.string()),
    pageCount: z.number(),
    baseName: z.string(),
  }),
  output: z.object({
    files: z.array(
      z.object({
        name: z.string(),
        bytes: z.string().describe('base64-encoded pdf'),
      }),
    ),
  }),
} as const;
