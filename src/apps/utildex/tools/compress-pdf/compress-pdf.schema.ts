import { z } from 'zod';

export const schema = {
  input: z.object({
    sourceBytes: z.string().describe('base64-encoded pdf'),
    mode: z.enum(['standard', 'image-optimize', 'maximum']).default('image-optimize'),
    quality: z.number().min(10).max(100).default(50).describe('JPEG quality (10-100)'),
  }),
  output: z.object({
    bytes: z.string().describe('base64-encoded compressed pdf'),
    originalSize: z.number().describe('original file size in bytes'),
    compressedSize: z.number().describe('compressed file size in bytes'),
    ratio: z.number().describe('compression ratio (0-100)'),
  }),
} as const;
