import { z } from 'zod';

export const schema = {
  input: z.object({
    pdfBytes: z.string().describe('base64-encoded pdf'),
    pageNumbers: z.array(z.number()).optional(),
    format: z.enum(['png', 'jpeg', 'webp']),
    scale: z.number().optional(),
  }),
  output: z.object({
    images: z.array(
      z.object({
        pageNumber: z.number(),
        bytes: z.string().describe('base64-encoded image'),
      }),
    ),
    error: z.string().nullable(),
  }),
} as const;
