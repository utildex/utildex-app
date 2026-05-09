import { z } from 'zod';

export const schema = {
  input: z.array(
    z.object({
      buffer: z.string().describe('base64-encoded image'),
      mimeType: z.string(),
      name: z.string(),
    }),
  ),
  output: z.object({
    success: z.boolean(),
    pdfBytes: z.string().describe('base64-encoded pdf').nullable(),
    error: z.string().nullable(),
  }),
} as const;
