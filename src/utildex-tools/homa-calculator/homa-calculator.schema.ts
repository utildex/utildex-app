import { z } from 'zod';

export const schema = {
  input: z.object({
    glucose: z.number(),
    glucoseUnit: z.enum(['mg/dL', 'mmol/L']),
    insulin: z.number(),
  }),
  output: z.object({
    homaIr: z.number().nullable(),
    homaB: z.number().nullable(),
    homaS: z.number().nullable(),
    quicki: z.number().nullable(),
    glucoseMmol: z.number().nullable(),
    glucoseMgdl: z.number().nullable(),
  }),
} as const;
