import { z } from 'zod';

export const schema = {
  input: z.array(
    z.object({
      name: z.string(),
      buffer: z.string().describe('base64-encoded pdf'),
    }),
  ),
  output: z.object({
    bytes: z.string().describe('base64-encoded pdf'),
  }),
} as const;
