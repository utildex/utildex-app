import * as path from 'path';
import {
  getAppCatalogEntry,
  isAppId,
} from '../../src/core/app-catalog';
import {
  assertKebabId,
  optionalString,
  parseModuleKind,
  requireString,
} from './cli';
import {
  defaultCategory,
  moduleNoun,
  parseTags,
  pascalCase,
  relativeImport,
  repoPath,
  titleFromId,
} from './common';
import { createOperation, readText, updateOperation } from './fs-plan';
import {
  moduleComponentTemplate,
  moduleContractI18nTemplate,
  moduleContractTemplate,
  moduleCssTemplate,
  moduleIndexTemplate,
  moduleKernelTemplate,
  moduleRuntimeI18nTemplate,
  moduleTemplate,
} from './module-templates';
import { SCAFFOLD_LANGUAGE_CODES } from './languages';
import { insertObjectEntry } from './source-edit';
import type { CliOptions, ModuleScaffoldOptions, ScaffoldPlan } from './types';

function createModuleOptions(flags: Map<string, string | boolean>): ModuleScaffoldOptions {
  const requestedApp = requireString(flags, 'app');
  if (!isAppId(requestedApp)) {
    throw new Error(`[scaffold] Unknown app id "${requestedApp}".`);
  }

  const id = requireString(flags, 'id');
  assertKebabId(id, 'Module id');

  const app = getAppCatalogEntry(requestedApp);
  const requestedKind = flags.get('kind');
  const kind =
    typeof requestedKind === 'string'
      ? parseModuleKind(requestedKind)
      : app.source.contentRoots[0].kind;
  const root = app.source.contentRoots.find((candidate) => candidate.kind === kind);
  if (!root) {
    throw new Error(`[scaffold] App "${requestedApp}" has no content root for kind "${kind}".`);
  }

  return {
    appId: requestedApp,
    id,
    kind,
    name: optionalString(flags, 'name', titleFromId(id)),
    description: optionalString(flags, 'description', `Starter ${moduleNoun(kind)} scaffold.`),
    category: optionalString(flags, 'category', defaultCategory(kind)),
    icon: optionalString(
      flags,
      'icon',
      kind === 'simulation' ? 'science' : kind === 'game' ? 'extension' : 'build',
    ),
    color: optionalString(flags, 'color', '#2563eb'),
    tags: parseTags(optionalString(flags, 'tags', `${moduleNoun(kind)},starter`)),
    contentRoot: root.path,
  };
}

export function planCreateModule(cli: CliOptions): ScaffoldPlan {
  const options = createModuleOptions(cli.flags);
  const app = getAppCatalogEntry(options.appId);
  const moduleDir = repoPath(options.contentRoot, options.id);
  const coreRegistryFile = app.source.coreRegistryFile;
  const toolRegistryFile = app.source.toolRegistryFile;
  const className = `${pascalCase(options.id)}Component`;
  const runtimeI18nFiles = SCAFFOLD_LANGUAGE_CODES.map((languageCode) =>
    createOperation(
      repoPath(moduleDir, 'i18n', `${languageCode}.ts`),
      `runtime translations (${languageCode})`,
      moduleRuntimeI18nTemplate(options),
    ),
  );

  const moduleFiles = [
    createOperation(
      repoPath(moduleDir, `${options.id}.component.ts`),
      'module Angular component',
      moduleComponentTemplate(options),
    ),
    createOperation(
      repoPath(moduleDir, `${options.id}.component.html`),
      'module Angular template',
      moduleTemplate(options),
    ),
    createOperation(
      repoPath(moduleDir, `${options.id}.component.css`),
      'module component styles',
      moduleCssTemplate(),
    ),
    createOperation(
      repoPath(moduleDir, `${options.id}.kernel.ts`),
      'module kernel scaffold',
      moduleKernelTemplate(options),
    ),
    createOperation(
      repoPath(moduleDir, `${options.id}.contract.ts`),
      'module contract scaffold',
      moduleContractTemplate(options),
    ),
    createOperation(
      repoPath(moduleDir, 'index.ts'),
      'module barrel exports',
      moduleIndexTemplate(options),
    ),
    createOperation(
      repoPath(moduleDir, 'i18n', 'contract.i18n.ts'),
      'module contract translations',
      moduleContractI18nTemplate(options),
    ),
    ...runtimeI18nFiles,
  ];

  const coreSource = readText(coreRegistryFile);
  if (coreSource.includes(`'${options.id}':`) || coreSource.includes(`${options.id}:`)) {
    throw new Error(`[scaffold] Core registry already contains module id "${options.id}".`);
  }

  const registryDir = path.posix.dirname(coreRegistryFile);
  const contractImport = relativeImport(registryDir, repoPath(moduleDir, `${options.id}.contract`));
  const kernelImport = relativeImport(registryDir, repoPath(moduleDir, `${options.id}.kernel`));
  const coreEntry = `  '${options.id}': {
    appName: '${options.appId}',
    contract: () => import('${contractImport}').then((m) => m.contract),
    kernel: () => import('${kernelImport}'),
  }`;

  const toolSource = readText(toolRegistryFile);
  if (toolSource.includes(`'${options.id}':`) || toolSource.includes(`${options.id}:`)) {
    throw new Error(`[scaffold] Tool registry already contains module id "${options.id}".`);
  }

  const toolRegistryDir = path.posix.dirname(toolRegistryFile);
  const componentImport = relativeImport(
    toolRegistryDir,
    repoPath(moduleDir, `${options.id}.component`),
  );
  const componentEntry = `  '${options.id}': () =>
    import('${componentImport}').then((m) => m.${className})`;

  return {
    command: 'create-module',
    dryRun: cli.dryRun,
    operations: [
      ...moduleFiles,
      updateOperation(
        coreRegistryFile,
        'register module contract and kernel loaders',
        insertObjectEntry(coreSource, 'CORE_REGISTRY', coreEntry),
      ),
      updateOperation(
        toolRegistryFile,
        'register module component loader',
        insertObjectEntry(toolSource, 'TOOL_COMPONENT_LOADERS', componentEntry),
      ),
    ],
  };
}
