import { z } from 'zod';

export const schema = {
  input: z.object({
    sourceBytes: z.string().describe('base64-encoded pdf'),
    angle: z.number(),
    mode: z.enum(['all', 'odd', 'even', 'specific']),
    specificRange: z.string(),
  }),
  output: z.object({
    bytes: z.string().describe('base64-encoded pdf'),
  }),
} as const;
