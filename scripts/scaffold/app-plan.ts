import {
  APP_CATALOG,
  APP_IDS,
  DEFAULT_APP_ID,
  getAppCatalogEntry,
} from '../../src/core/app-catalog';
import {
  assertKebabId,
  optionalString,
  parseModuleKind,
  parsePositiveInteger,
  requireString,
} from './cli';
import { pluralKind } from './common';
import {
  appCatalogEntryTemplate,
  appComponentHtmlTemplate,
  appComponentTsTemplate,
  appConfigTemplate,
  emptyCoreRegistryTemplate,
  emptyModuleRegistryTemplate,
  emptyToolSpaceRegistryTemplate,
  indexHtmlTemplate,
  indexTsxTemplate,
  manifestTemplate,
  ngswTemplate,
  offlineRouteLoadersTemplate,
  routesTemplate,
  welcomeComponentTemplate,
} from './app-templates';
import { createOperation, readJson, readText, stringifyJson, updateOperation } from './fs-plan';
import type {
  AppScaffoldOptions,
  CliOptions,
  PackageJsonLike,
  ScaffoldPlan,
  TsConfigLike,
} from './types';

function nextDevPort(): number {
  return Math.max(...APP_IDS.map((appId) => getAppCatalogEntry(appId).devServerPort)) + 1;
}

function createAppOptions(flags: Map<string, string | boolean>): AppScaffoldOptions {
  const id = requireString(flags, 'id');
  assertKebabId(id, 'App id');

  if (Object.prototype.hasOwnProperty.call(APP_CATALOG, id)) {
    throw new Error(`[scaffold] App id "${id}" already exists in APP_CATALOG.`);
  }

  const kind = parseModuleKind(requireString(flags, 'kind'));
  const name = requireString(flags, 'name');
  const route = requireString(flags, 'route');
  assertKebabId(route, 'Route segment');

  return {
    id,
    name,
    kind,
    route,
    port: parsePositiveInteger(
      optionalString(flags, 'port', String(nextDevPort())),
      'Dev server port',
    ),
    publicBaseUrl: optionalString(flags, 'base-url', `https://${id}.example.com`),
    githubUrl: optionalString(flags, 'github-url', 'https://github.com/utildex/utildex-app'),
    description: optionalString(
      flags,
      'description',
      `${name} modules powered by the Utildex platform.`,
    ),
    themeColor: optionalString(flags, 'theme-color', '#2563eb'),
    backgroundColor: optionalString(flags, 'background-color', '#0f172a'),
    contentRoot: optionalString(flags, 'content-root', `src/apps/${id}/${pluralKind(kind)}`),
  };
}

function updateAngularJson(options: AppScaffoldOptions): string {
  const workspace = readJson<Record<string, unknown>>('angular.json');
  const defaultApp = getAppCatalogEntry(DEFAULT_APP_ID);
  const projects = workspace.projects as Record<string, unknown>;
  const appProject = projects.app as Record<string, unknown>;
  const architect = appProject.architect as Record<string, unknown>;
  const build = architect.build as Record<string, unknown>;
  const serve = architect.serve as Record<string, unknown>;
  const buildConfigurations = build.configurations as Record<string, unknown>;
  const serveConfigurations = serve.configurations as Record<string, unknown>;

  if (buildConfigurations[options.id] || serveConfigurations[options.id]) {
    throw new Error(`[scaffold] angular.json already contains configuration "${options.id}".`);
  }

  buildConfigurations[options.id] = {
    serviceWorker: `src/apps/${options.id}/entry/ngsw-config.json`,
    optimization: {
      scripts: true,
      styles: {
        minify: true,
        inlineCritical: false,
      },
      fonts: true,
    },
    index: {
      input: `src/apps/${options.id}/entry/index.html`,
      output: 'index.html',
    },
    sourceMap: false,
    namedChunks: false,
    extractLicenses: true,
    outputHashing: 'all',
    outputPath: {
      base: `./dist/${options.id}`,
      browser: '.',
    },
    assets: [
      {
        glob: '**/*',
        input: 'src/assets',
        output: 'assets',
        ignore: ['mcp/**'],
      },
      {
        glob: '_redirects',
        input: 'src',
        output: '.',
      },
      {
        glob: '_headers',
        input: 'src',
        output: '.',
      },
      {
        glob: '*',
        input: `src/apps/${options.id}/seo`,
        output: '.',
      },
      {
        glob: 'manifest.webmanifest',
        input: `src/apps/${options.id}/entry`,
        output: '.',
      },
    ],
    fileReplacements: [
      {
        replace: defaultApp.source.entryPointFile,
        with: `src/apps/${options.id}/entry/index.tsx`,
      },
      {
        replace: defaultApp.source.appConfigFile,
        with: `src/apps/${options.id}/entry/app.config.ts`,
      },
      {
        replace: 'src/core/core-registry.ts',
        with: `src/apps/${options.id}/core-registry.${options.id}.ts`,
      },
      {
        replace: 'src/apps/utildex/module-registry.ts',
        with: `src/apps/${options.id}/module-registry.ts`,
      },
      {
        replace: 'src/data/tool-space-registry.ts',
        with: `src/apps/${options.id}/tool-space-registry.${options.id}.ts`,
      },
      {
        replace: 'src/services/offline-route-loaders.ts',
        with: `src/apps/${options.id}/offline-route-loaders.${options.id}.ts`,
      },
    ],
  };

  serveConfigurations[options.id] = {
    buildTarget: `app:build:${options.id}`,
  };

  return stringifyJson(workspace);
}

function updatePackageJson(options: AppScaffoldOptions): string {
  const pkg = readJson<PackageJsonLike>('package.json');
  const scripts = pkg.scripts ?? {};
  pkg.scripts = scripts;

  for (const scriptName of [
    `dev:${options.id}`,
    `build:${options.id}`,
    `preview:${options.id}`,
    `sitemap:${options.id}`,
  ]) {
    if (scripts[scriptName]) {
      throw new Error(`[scaffold] package.json already contains script "${scriptName}".`);
    }
  }

  scripts[`dev:${options.id}`] = `tsx scripts/run-app-command.ts serve --app=${options.id}`;
  scripts[`prebuild:${options.id}`] = 'npm run prebuild:checks';
  scripts[`build:${options.id}`] = `tsx scripts/run-app-command.ts build --app=${options.id}`;
  scripts[`preview:${options.id}`] = `tsx scripts/run-app-command.ts preview --app=${options.id}`;
  scripts[`sitemap:${options.id}`] = `tsx scripts/generate-sitemap.ts --app=${options.id}`;

  return stringifyJson(pkg);
}

function updateTsConfig(options: AppScaffoldOptions): string {
  const tsconfig = readJson<TsConfigLike>('tsconfig.json');
  const files = tsconfig.files ?? [];
  tsconfig.files = files;
  const entry = `./src/apps/${options.id}/entry/index.tsx`;
  if (files.includes(entry)) {
    throw new Error(`[scaffold] tsconfig.json already includes ${entry}.`);
  }
  files.push(entry);
  return stringifyJson(tsconfig);
}

function updateAppCatalog(options: AppScaffoldOptions): string {
  const source = readText('src/core/app-catalog.ts');
  return source.replace(
    /\n} as const satisfies Record<string, AppCatalogEntry>;/,
    `,\n${appCatalogEntryTemplate(options)}\n} as const satisfies Record<string, AppCatalogEntry>;`,
  );
}

export function planCreateApp(cli: CliOptions): ScaffoldPlan {
  const options = createAppOptions(cli.flags);

  return {
    command: 'create-app',
    dryRun: cli.dryRun,
    operations: [
      createOperation(
        `src/apps/${options.id}/entry/app.config.ts`,
        'app runtime config',
        appConfigTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/entry/index.tsx`,
        'app bootstrap entry point',
        indexTsxTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/entry/index.html`,
        'app index HTML',
        indexHtmlTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/entry/manifest.webmanifest`,
        'app web manifest',
        manifestTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/entry/ngsw-config.json`,
        'app service worker config',
        ngswTemplate(),
      ),
      createOperation(
        `src/apps/${options.id}/shell/app.component.ts`,
        'app shell component',
        appComponentTsTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/shell/app.component.html`,
        'app shell template',
        appComponentHtmlTemplate(),
      ),
      createOperation(
        `src/apps/${options.id}/routing/app.routes.ts`,
        'app route manifest',
        routesTemplate(options),
      ),
      createOperation(
        `src/pages/${options.id}-welcome/${options.id}-welcome.component.ts`,
        'app welcome page',
        welcomeComponentTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/core-registry.${options.id}.ts`,
        'empty app core registry',
        emptyCoreRegistryTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/module-registry.ts`,
        'empty app component registry',
        emptyModuleRegistryTemplate(options),
      ),
      createOperation(
        `src/apps/${options.id}/tool-space-registry.${options.id}.ts`,
        'empty app space registry',
        emptyToolSpaceRegistryTemplate(),
      ),
      createOperation(
        `src/apps/${options.id}/offline-route-loaders.${options.id}.ts`,
        'app offline route loaders',
        offlineRouteLoadersTemplate(options),
      ),
      createOperation(
        `${options.contentRoot}/README.md`,
        'app module root placeholder',
        `# ${options.name} Modules\n\nScaffolded ${pluralKind(options.kind)} live in this directory.\n`,
      ),
      createOperation(
        `src/apps/${options.id}/seo/.gitkeep`,
        'app SEO output directory placeholder',
        '',
      ),
      updateOperation(
        'src/core/app-catalog.ts',
        'register app in APP_CATALOG',
        updateAppCatalog(options),
      ),
      updateOperation(
        'angular.json',
        'add Angular build and serve configurations',
        updateAngularJson(options),
      ),
      updateOperation('package.json', 'add app convenience scripts', updatePackageJson(options)),
      updateOperation('tsconfig.json', 'include app entry point', updateTsConfig(options)),
    ],
  };
}
