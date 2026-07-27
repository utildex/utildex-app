import { z } from 'zod';

export const FORMAT_IDS = ['a4', 'a3', 'letter', 'legal', 'tabloid'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export const schema = {
  input: z.object({
    sourceBytes: z.string().describe('base64-encoded pdf'),
    format: z.enum(FORMAT_IDS).default('a4'),
  }),
  output: z.object({
    bytes: z.string().describe('base64-encoded uniformized pdf'),
    pageCount: z.number(),
  }),
} as const;
