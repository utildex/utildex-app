/**
 * JSON Formatter Kernel — pure transformation logic.
 *
 * No Angular imports. No UI dependencies. No registry access.
 * Callable as a pure function for pipeline orchestration.
 */

export type IndentOption = 2 | 4 | 'tab';

export interface FormatResult {
  success: boolean;
  output: string;
  error: string | null;
}

/**
 * Parse and format JSON with the specified indentation.
 */
export function formatJson(input: string, indent: IndentOption = 2): FormatResult {
  if (!input.trim()) {
    return { success: true, output: '', error: null };
  }
  try {
    const parsed = JSON.parse(input);
    const space = indent === 'tab' ? '\t' : indent;
    return { success: true, output: JSON.stringify(parsed, null, space), error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { success: false, output: input, error: message };
  }
}

/**
 * Parse and minify JSON (remove all whitespace).
 */
export function minifyJson(input: string): FormatResult {
  if (!input.trim()) {
    return { success: true, output: '', error: null };
  }
  try {
    const parsed = JSON.parse(input);
    return { success: true, output: JSON.stringify(parsed), error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { success: false, output: input, error: message };
  }
}

/**
 * Validate JSON input string.
 */
export function validateJson(input: string): { valid: boolean; error: string | null } {
  if (!input.trim()) {
    return { valid: true, error: null };
  }
  try {
    JSON.parse(input);
    return { valid: true, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { valid: false, error: message };
  }
}

/**
 * Pipeline entry point — format JSON with default settings.
 */
export function run(input: string): FormatResult {
  return formatJson(input, 2);
}
