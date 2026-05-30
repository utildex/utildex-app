import * as path from 'path';
import type { ModuleKind } from '../../src/core/app-catalog';

export function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function repoPath(...segments: string[]): string {
  return toPosix(path.join(...segments));
}

export function relativeImport(fromDir: string, targetWithoutExtension: string): string {
  const relative = toPosix(path.posix.relative(toPosix(fromDir), toPosix(targetWithoutExtension)));
  return relative.startsWith('.') ? relative : `./${relative}`;
}

export function titleFromId(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function pascalCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function escapeSingleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function defaultCategory(kind: ModuleKind): string {
  if (kind === 'game') return 'Cognition';
  if (kind === 'simulation') return 'Simulation';
  return 'Utility';
}

export function pluralKind(kind: ModuleKind): string {
  if (kind === 'game') return 'games';
  if (kind === 'simulation') return 'simulations';
  return 'tools';
}

export function moduleNoun(kind: ModuleKind): string {
  if (kind === 'game') return 'game';
  if (kind === 'simulation') return 'simulation';
  return 'tool';
}

export function objectKey(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : `'${escapeSingleQuoted(value)}'`;
}
