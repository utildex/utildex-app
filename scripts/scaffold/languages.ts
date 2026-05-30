import { LANGUAGES } from '../../src/data/languages';

export const SCAFFOLD_LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

if (!SCAFFOLD_LANGUAGE_CODES.includes('en')) {
  throw new Error('[scaffold] src/data/languages.ts must include "en" as fallback language.');
}

export function languageImportIdentifier(code: string): string {
  const normalized = code.replace(/[^A-Za-z0-9_$]/g, '_');
  return `lang_${normalized || 'value'}`;
}
