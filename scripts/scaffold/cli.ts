import { ID_RE, VALID_MODULE_KINDS } from './constants';
import type { CliOptions, ScaffoldCommand } from './types';
import {
  APP_IDS,
  getAppCatalogEntry,
  isAppId,
  type ModuleKind,
} from '../../src/core/app-catalog';
import { defaultCategory, moduleNoun, pluralKind, titleFromId } from './common';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export function usage(): string {
  return `Usage:
  npm run scaffold -- create-module --app=<appId> --id=<module-id> [--kind=tool|game|simulation] [--name="Display Name"] [--description="..."] [--dry-run] [--json]
  npm run scaffold -- create-app --id=<app-id> --name="App Name" --kind=tool|game|simulation --route=<route-segment> [--port=3003] [--dry-run] [--json]
  npm run scaffold -- --interactive

Examples:
  npm run scaffold -- create-module --app=synedex --id=memory-grid --kind=game --dry-run
  npm run scaffold -- create-app --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run
  npm run scaffold -- --interactive`;
}

function parseFlags(args: string[]): Map<string, string | boolean> {
  const flags = new Map<string, string | boolean>();

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

  return flags;
}

async function ask(
  question: string,
  fallback?: string,
  validate?: (value: string) => string | null,
): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const suffix = fallback !== undefined ? ` [${fallback}]` : '';
      const raw = (await rl.question(`${question}${suffix}: `)).trim();
      const value = raw || fallback || '';

      if (!value) {
        console.log('[scaffold] Value is required.');
        continue;
      }

      const error = validate ? validate(value) : null;
      if (!error) return value;
      console.log(`[scaffold] ${error}`);
    }
  } finally {
    rl.close();
  }
}

async function askOptional(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    const raw = (await rl.question(`${question} [${fallback}]: `)).trim();
    return raw || fallback;
  } finally {
    rl.close();
  }
}

async function askBoolean(question: string, fallback: boolean): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const raw = (await rl.question(`${question} (${fallback ? 'Y/n' : 'y/N'}): `))
        .trim()
        .toLowerCase();
      if (!raw) return fallback;
      if (raw === 'y' || raw === 'yes') return true;
      if (raw === 'n' || raw === 'no') return false;
      console.log('[scaffold] Please answer y or n.');
    }
  } finally {
    rl.close();
  }
}

async function askChoice<T extends string>(
  question: string,
  choices: readonly { label: string; value: T }[],
  fallback: T,
): Promise<T> {
  console.log(`[scaffold] ${question}`);
  for (let index = 0; index < choices.length; index += 1) {
    console.log(`  ${index + 1}) ${choices[index].label}`);
  }

  const fallbackIndex = Math.max(
    1,
    choices.findIndex((choice) => choice.value === fallback) + 1,
  );

  while (true) {
    const selected = await ask('Choose an option', String(fallbackIndex));
    const number = Number(selected);
    if (Number.isInteger(number) && number >= 1 && number <= choices.length) {
      return choices[number - 1].value;
    }

    const byValue = choices.find((choice) => choice.value === (selected as T));
    if (byValue) return byValue.value;

    console.log('[scaffold] Invalid menu selection.');
  }
}

function sanitizeSeedFlags(seed: Map<string, string | boolean>): Map<string, string | boolean> {
  const flags = new Map(seed);
  flags.delete('interactive');
  return flags;
}

function defaultIcon(kind: ModuleKind): string {
  return kind === 'simulation' ? 'science' : kind === 'game' ? 'extension' : 'build';
}

async function promptCreateModule(
  seedFlags: Map<string, string | boolean>,
): Promise<Map<string, string | boolean>> {
  const flags = sanitizeSeedFlags(seedFlags);
  const requestedApp = flags.get('app');
  const appFallback =
    typeof requestedApp === 'string' && isAppId(requestedApp) ? requestedApp : APP_IDS[0];

  const appChoices = APP_IDS.map((appId) => {
    const app = getAppCatalogEntry(appId);
    return {
      value: appId,
      label: `${appId} (${app.appName})`,
    };
  });

  const appId = await askChoice('Select target app', appChoices, appFallback);
  flags.set('app', appId);

  const id = await ask(
    'Module id (kebab-case)',
    typeof flags.get('id') === 'string' ? (flags.get('id') as string) : undefined,
    (value) => {
      try {
        assertKebabId(value, 'Module id');
        return null;
      } catch (error) {
        return error instanceof Error ? error.message.replace('[scaffold] ', '') : 'Invalid id';
      }
    },
  );
  flags.set('id', id);

  const app = getAppCatalogEntry(appId);
  const seededKind = flags.get('kind');
  const kindFallback =
    typeof seededKind === 'string' && VALID_MODULE_KINDS.has(seededKind as ModuleKind)
      ? (seededKind as ModuleKind)
      : app.source.contentRoots[0].kind;
  const kind = await askChoice(
    'Select module kind',
    [
      { value: 'tool', label: 'tool' },
      { value: 'game', label: 'game' },
      { value: 'simulation', label: 'simulation' },
    ],
    kindFallback,
  );
  flags.set('kind', kind);

  flags.set(
    'name',
    await askOptional(
      'Display name',
      typeof flags.get('name') === 'string' ? (flags.get('name') as string) : titleFromId(id),
    ),
  );
  flags.set(
    'description',
    await askOptional(
      'Description',
      typeof flags.get('description') === 'string'
        ? (flags.get('description') as string)
        : `Starter ${moduleNoun(kind)} scaffold.`,
    ),
  );
  flags.set(
    'category',
    await askOptional(
      'Category',
      typeof flags.get('category') === 'string'
        ? (flags.get('category') as string)
        : defaultCategory(kind),
    ),
  );
  flags.set(
    'icon',
    await askOptional(
      'Material icon',
      typeof flags.get('icon') === 'string' ? (flags.get('icon') as string) : defaultIcon(kind),
    ),
  );
  flags.set(
    'color',
    await askOptional(
      'Color',
      typeof flags.get('color') === 'string' ? (flags.get('color') as string) : '#2563eb',
    ),
  );
  flags.set(
    'tags',
    await askOptional(
      'Tags (comma-separated)',
      typeof flags.get('tags') === 'string'
        ? (flags.get('tags') as string)
        : `${moduleNoun(kind)},starter`,
    ),
  );

  return flags;
}

async function promptCreateApp(
  seedFlags: Map<string, string | boolean>,
): Promise<Map<string, string | boolean>> {
  const flags = sanitizeSeedFlags(seedFlags);

  const id = await ask(
    'App id (kebab-case)',
    typeof flags.get('id') === 'string' ? (flags.get('id') as string) : undefined,
    (value) => {
      try {
        assertKebabId(value, 'App id');
        return null;
      } catch (error) {
        return error instanceof Error ? error.message.replace('[scaffold] ', '') : 'Invalid id';
      }
    },
  );
  flags.set('id', id);

  flags.set(
    'name',
    await ask(
      'App name',
      typeof flags.get('name') === 'string' ? (flags.get('name') as string) : titleFromId(id),
    ),
  );

  const seededKind = flags.get('kind');
  const kindFallback =
    typeof seededKind === 'string' && VALID_MODULE_KINDS.has(seededKind as ModuleKind)
      ? (seededKind as ModuleKind)
      : 'tool';
  const kind = await askChoice(
    'Select app module kind',
    [
      { value: 'tool', label: 'tool' },
      { value: 'game', label: 'game' },
      { value: 'simulation', label: 'simulation' },
    ],
    kindFallback,
  );
  flags.set('kind', kind);

  const route = await ask(
    'Route segment (kebab-case)',
    typeof flags.get('route') === 'string' ? (flags.get('route') as string) : undefined,
    (value) => {
      try {
        assertKebabId(value, 'Route segment');
        return null;
      } catch (error) {
        return error instanceof Error ? error.message.replace('[scaffold] ', '') : 'Invalid route';
      }
    },
  );
  flags.set('route', route);

  const nextPort = Math.max(...APP_IDS.map((appId) => getAppCatalogEntry(appId).devServerPort)) + 1;
  const port = await ask(
    'Dev server port',
    typeof flags.get('port') === 'string' ? (flags.get('port') as string) : String(nextPort),
    (value) => {
      try {
        parsePositiveInteger(value, 'Dev server port');
        return null;
      } catch (error) {
        return error instanceof Error ? error.message.replace('[scaffold] ', '') : 'Invalid port';
      }
    },
  );
  flags.set('port', port);

  flags.set(
    'base-url',
    await askOptional(
      'Public base URL',
      typeof flags.get('base-url') === 'string'
        ? (flags.get('base-url') as string)
        : `https://${id}.example.com`,
    ),
  );
  flags.set(
    'github-url',
    await askOptional(
      'GitHub URL',
      typeof flags.get('github-url') === 'string'
        ? (flags.get('github-url') as string)
        : 'https://github.com/utildex/utildex-app',
    ),
  );
  flags.set(
    'description',
    await askOptional(
      'Description',
      typeof flags.get('description') === 'string'
        ? (flags.get('description') as string)
        : `${flags.get('name')} modules powered by the Utildex platform.`,
    ),
  );
  flags.set(
    'theme-color',
    await askOptional(
      'Theme color',
      typeof flags.get('theme-color') === 'string'
        ? (flags.get('theme-color') as string)
        : '#2563eb',
    ),
  );
  flags.set(
    'background-color',
    await askOptional(
      'Background color',
      typeof flags.get('background-color') === 'string'
        ? (flags.get('background-color') as string)
        : '#0f172a',
    ),
  );
  flags.set(
    'content-root',
    await askOptional(
      'Content root',
      typeof flags.get('content-root') === 'string'
        ? (flags.get('content-root') as string)
        : `src/${id}-${pluralKind(kind)}`,
    ),
  );

  return flags;
}

async function promptInteractive(
  seededCommand: ScaffoldCommand | undefined,
  seedFlags: Map<string, string | boolean>,
): Promise<CliOptions> {
  console.log('[scaffold] Interactive mode');

  const command =
    seededCommand ??
    (await askChoice(
      'What do you want to scaffold?',
      [
        { value: 'create-module', label: 'create-module' },
        { value: 'create-app', label: 'create-app' },
      ],
      'create-module',
    ));

  const flags =
    command === 'create-module'
      ? await promptCreateModule(seedFlags)
      : await promptCreateApp(seedFlags);

  const dryRun = await askBoolean('Dry run only', seedFlags.get('dry-run') !== false);
  const json = await askBoolean('Print JSON plan', seedFlags.get('json') === true);

  if (dryRun) {
    flags.set('dry-run', true);
  } else {
    flags.delete('dry-run');
  }

  if (json) {
    flags.set('json', true);
  } else {
    flags.delete('json');
  }

  return {
    command,
    flags,
    dryRun,
    json,
  };
}

export async function parseCli(): Promise<CliOptions> {
  const first = process.argv[2];
  const command =
    first === 'create-module' || first === 'create-app' ? (first as ScaffoldCommand) : undefined;
  const flagArgs = process.argv.slice(command ? 3 : 2);
  const flags = parseFlags(flagArgs);
  const interactiveRequested = flags.get('interactive') === true;

  if (!command && first && !first.startsWith('--') && !interactiveRequested) {
    throw new Error(`[scaffold] Unknown command "${first}".\n\n${usage()}`);
  }

  const shouldPrompt = interactiveRequested || !command;
  if (shouldPrompt) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('[scaffold] Interactive mode requires a TTY terminal.');
    }
    return promptInteractive(command, flags);
  }

  return {
    command: command as ScaffoldCommand,
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
