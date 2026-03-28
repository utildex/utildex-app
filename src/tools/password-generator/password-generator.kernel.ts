import type { z } from 'zod';
import { schema } from './password-generator.schema';

export interface PasswordOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  rng?: () => number;
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS = '0123456789';
const SYMS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function generatePassword(options: PasswordOptions): string {
  let chars = '';
  if (options.useLowercase) chars += LOWER;
  if (options.useUppercase) chars += UPPER;
  if (options.useNumbers) chars += NUMS;
  if (options.useSymbols) chars += SYMS;

  if (!chars) return '';

  const rng = options.rng ?? Math.random;
  const len = Math.max(1, options.length);
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(rng() * chars.length));
  }
  return result;
}

export function scorePasswordStrength(options: PasswordOptions): number {
  let score = 0;
  if (options.length > 8) score++;
  if (options.length > 12) score++;
  if (options.useUppercase) score++;
  if (options.useLowercase) score++;
  if (options.useNumbers) score++;
  if (options.useSymbols) score++;
  return Math.min(4, Math.floor(score / 1.5));
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return {
    password: generatePassword(input),
    score: scorePasswordStrength(input),
  };
}
