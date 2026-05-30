import { ID_RE, VALID_MODULE_KINDS } from './constants';
import type { CliOptions, ScaffoldCommand } from './types';
import type { ModuleKind } from '../../src/core/app-catalog';

export function usage(): string {
  return `Usage:
  npm run scaffold -- create-module --app=<appId> --id=<module-id> [--kind=tool|game|simulation] [--name="Display Name"] [--description="..."] [--dry-run] [--json]
  npm run scaffold -- create-app --id=<app-id> --name="App Name" --kind=tool|game|simulation --route=<route-segment> [--port=3003] [--dry-run] [--json]

Examples:
  npm run scaffold -- create-module --app=synedex --id=memory-grid --kind=game --dry-run
  npm run scaffold -- create-app --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run`;
}

export function parseCli(): CliOptions {
  const command = process.argv[2] as ScaffoldCommand | undefined;
  if (command !== 'create-module' && command !== 'create-app') {
    throw new Error(usage());
  }

  const flags = new Map<string, string | boolean>();
  const args = process.argv.slice(3);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`[scaffold] Unexpected argument "${arg}".\n\n${usage()}`);
    }

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex !== -1) {
      flags.set(withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1));
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(withoutPrefix, next);
      index += 1;
    } else {
      flags.set(withoutPrefix, true);
    }
  }

  return {
    command,
    flags,
    dryRun: flags.get('dry-run') === true,
    json: flags.get('json') === true,
  };
}

export function requireString(flags: Map<string, string | boolean>, name: string): string {
  const value = flags.get(name);
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`[scaffold] Missing required --${name} value.`);
  }
  return value.trim();
}

export function optionalString(
  flags: Map<string, string | boolean>,
  name: string,
  fallback: string,
): string {
  const value = flags.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[scaffold] ${label} must be a positive integer.`);
  }
  return parsed;
}

export function assertKebabId(value: string, label: string): void {
  if (!ID_RE.test(value)) {
    throw new Error(`[scaffold] ${label} must be lowercase kebab-case.`);
  }
}

export function parseModuleKind(value: string): ModuleKind {
  if (VALID_MODULE_KINDS.has(value as ModuleKind)) {
    return value as ModuleKind;
  }
  throw new Error('[scaffold] Module kind must be one of: tool, game, simulation.');
}
