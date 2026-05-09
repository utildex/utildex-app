import { z } from 'zod';

const resolvedLanguageSchema = z.enum([
  'javascript',
  'typescript',
  'json',
  'html',
  'css',
  'python',
  'java',
  'sql',
  'bash',
  'yaml',
  'markdown',
  'csharp',
  'ocaml',
  'julia',
  'plaintext',
]);

export const schema = {
  input: z.string(),
  output: z.object({
    language: resolvedLanguageSchema,
    html: z.string(),
  }),
} as const;
