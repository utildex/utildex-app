import { z } from 'zod';

export const schema = {
  input: z.object({
    imageBytes: z.string().describe('base64-encoded image'),
    sourceMimeType: z.string().optional(),
    format: z.string(),
    quality: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    imageBytes: z.string().describe('base64-encoded image').nullable(),
    error: z.string().nullable(),
  }),
} as const;
