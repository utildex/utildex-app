import { z } from 'zod';

const jsonErrorDetailsSchema = z.object({
  message: z.string(),
  position: z.number().nullable(),
  line: z.number().nullable(),
  column: z.number().nullable(),
});

export const schema = {
  input: z.string(),
  output: z.object({
    success: z.boolean(),
    output: z.string(),
    error: z.string().nullable(),
    errorDetails: jsonErrorDetailsSchema.nullable(),
  }),
} as const;
