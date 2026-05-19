import { spawnSync } from 'child_process';
import { DEFAULT_APP_ID, getAppCatalogEntry, isAppId, type AppId } from '../src/core/app-catalog';

type AppCommand = 'build' | 'serve' | 'preview';

function parseArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return undefined;
}

function parseAppId(): AppId {
  const requested = parseArgValue('app') ?? DEFAULT_APP_ID;
  if (isAppId(requested)) return requested;

  throw new Error(`[app-command] Unknown app id "${requested}".`);
}

function parsePort(defaultPort: number): number {
  const requested = parseArgValue('port');
  if (!requested) return defaultPort;

  const parsed = Number(requested);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[app-command] Invalid --port value "${requested}".`);
  }

  return parsed;
}

function parsePassthroughArgs(): string[] {
  const separatorIndex = process.argv.indexOf('--');
  if (separatorIndex === -1) return [];
  return process.argv.slice(separatorIndex + 1);
}

function run(command: string, args: string[]): never {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

function main() {
  const command = process.argv[2] as AppCommand | undefined;
  if (command !== 'build' && command !== 'serve' && command !== 'preview') {
    throw new Error(
      '[app-command] Usage: tsx scripts/run-app-command.ts <build|serve|preview> --app=<appId>',
    );
  }

  const appId = parseAppId();
  const app = getAppCatalogEntry(appId);
  const passthroughArgs = parsePassthroughArgs();

  if (command === 'build') {
    run('ng', ['build', `--configuration=${app.buildConfiguration}`, ...passthroughArgs]);
  }

  const port = parsePort(app.devServerPort);
  run('ng', [
    'serve',
    `--configuration=${app.buildConfiguration}`,
    `--port=${port}`,
    ...passthroughArgs,
  ]);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
