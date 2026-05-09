import { z } from 'zod';

const jwtTemporalStatusSchema = z.enum([
  'valid',
  'expired',
  'not-yet-valid',
  'unbounded',
  'invalid',
]);

const jwtDecodeErrorCodeSchema = z.enum([
  'INVALID_FORMAT',
  'HEADER_DECODE_FAILED',
  'PAYLOAD_DECODE_FAILED',
  'HEADER_JSON_INVALID',
  'PAYLOAD_JSON_INVALID',
]);

export const schema = {
  input: z.object({
    token: z.string(),
    pretty: z.boolean().optional(),
  }),
  output: z.object({
    token: z.string(),
    headerSegment: z.string(),
    payloadSegment: z.string(),
    signatureSegment: z.string(),
    headerText: z.string(),
    payloadText: z.string(),
    header: z.record(z.string(), z.unknown()).nullable(),
    payload: z.record(z.string(), z.unknown()).nullable(),
    algorithm: z.string().nullable(),
    tokenType: z.string().nullable(),
    issuedAt: z.number().nullable(),
    notBefore: z.number().nullable(),
    expiresAt: z.number().nullable(),
    temporalStatus: jwtTemporalStatusSchema,
    error: jwtDecodeErrorCodeSchema.nullable(),
  }),
} as const;
