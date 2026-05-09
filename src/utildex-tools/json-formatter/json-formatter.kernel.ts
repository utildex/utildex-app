import type { z } from 'zod';
import { schema } from './json-formatter.schema';

/**
 * JSON Formatter Kernel — pure transformation logic.
 *
 * No Angular imports. No UI dependencies. No registry access.
 * Callable as a pure function for pipeline orchestration.
 */

export type IndentOption = 2 | 4 | 'tab';

export interface JsonErrorDetails {
  message: string;
  position: number | null;
  line: number | null;
  column: number | null;
}

export interface FormatResult {
  success: boolean;
  output: string;
  error: string | null;
  errorDetails: JsonErrorDetails | null;
}

/**
 * Parse and format JSON with the specified indentation.
 */
export function formatJson(input: string, indent: IndentOption = 2): FormatResult {
  if (!input.trim()) {
    return { success: true, output: '', error: null, errorDetails: null };
  }
  try {
    const parsed = JSON.parse(input);
    const space = indent === 'tab' ? '\t' : indent;
    return {
      success: true,
      output: JSON.stringify(parsed, null, space),
      error: null,
      errorDetails: null,
    };
  } catch (e: unknown) {
    const errorDetails = buildErrorDetails(e, input);
    return {
      success: false,
      output: input,
      error: errorDetails.message,
      errorDetails,
    };
  }
}

/**
 * Parse and minify JSON (remove all whitespace).
 */
export function minifyJson(input: string): FormatResult {
  if (!input.trim()) {
    return { success: true, output: '', error: null, errorDetails: null };
  }
  try {
    const parsed = JSON.parse(input);
    return { success: true, output: JSON.stringify(parsed), error: null, errorDetails: null };
  } catch (e: unknown) {
    const errorDetails = buildErrorDetails(e, input);
    return {
      success: false,
      output: input,
      error: errorDetails.message,
      errorDetails,
    };
  }
}

/**
 * Validate JSON input string.
 */
export function validateJson(input: string): {
  valid: boolean;
  error: string | null;
  errorDetails: JsonErrorDetails | null;
} {
  if (!input.trim()) {
    return { valid: true, error: null, errorDetails: null };
  }
  try {
    JSON.parse(input);
    return { valid: true, error: null, errorDetails: null };
  } catch (e: unknown) {
    const errorDetails = buildErrorDetails(e, input);
    return { valid: false, error: errorDetails.message, errorDetails };
  }
}

function buildErrorDetails(error: unknown, source: string): JsonErrorDetails {
  const message = error instanceof Error ? error.message : 'Invalid JSON';
  const location = extractJsonErrorLocation(message, source);
  return {
    message,
    position: location?.position ?? null,
    line: location?.line ?? null,
    column: location?.column ?? null,
  };
}

function extractJsonErrorLocation(
  errorMessage: string,
  source: string,
): { position: number; line: number; column: number } | null {
  const lineColumnMatch = errorMessage.match(/line\s*(\d+)\s*column\s*(\d+)/i);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    if (line > 0 && column > 0) {
      const position = lineColumnToPosition(source, line, column);
      return { position, line, column };
    }
  }

  const positionMatch = errorMessage.match(/position\s*(\d+)/i);
  if (positionMatch) {
    const rawPosition = Number(positionMatch[1]);
    if (Number.isFinite(rawPosition)) {
      const clamped = Math.max(0, Math.min(rawPosition, source.length));
      const { line, column } = positionToLineColumn(source, clamped);
      return { position: clamped, line, column };
    }
  }

  return null;
}

function positionToLineColumn(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, position);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

function lineColumnToPosition(text: string, line: number, column: number): number {
  const targetLine = Math.max(1, line);
  const targetColumn = Math.max(1, column);

  let currentLine = 1;
  let currentColumn = 1;

  for (let i = 0; i < text.length; i += 1) {
    if (currentLine === targetLine && currentColumn === targetColumn) {
      return i;
    }

    const char = text[i];
    if (char === '\n') {
      currentLine += 1;
      currentColumn = 1;
    } else if (char !== '\r') {
      currentColumn += 1;
    }
  }

  return text.length;
}

/**
 * Pipeline entry point — format JSON with default settings.
 */
export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return formatJson(input, 2);
}
