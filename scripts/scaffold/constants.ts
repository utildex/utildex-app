import * as path from 'path';
import type { ModuleKind } from '../../src/core/app-catalog';

export const VALID_MODULE_KINDS = new Set<ModuleKind>(['tool', 'game', 'simulation']);
export const ID_RE = /^[a-z][a-z0-9-]*$/;
export const ROOT = process.cwd();

export function absolute(filePath: string): string {
  return path.join(ROOT, filePath);
}
