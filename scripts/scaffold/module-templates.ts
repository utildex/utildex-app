import {
  escapeSingleQuoted,
  moduleNoun,
  objectKey,
  pascalCase,
  relativeImport,
  repoPath,
} from './common';
import { SCAFFOLD_LANGUAGE_CODES, languageImportIdentifier } from './languages';
import type { ModuleScaffoldOptions } from './types';

export function moduleComponentTemplate(options: ModuleScaffoldOptions): string {
  const className = `${pascalCase(options.id)}Component`;
  const moduleDir = repoPath(options.contentRoot, options.id);
  const coreI18n = relativeImport(moduleDir, 'src/core/i18n');
  const toolLayout = relativeImport(moduleDir, 'src/components/tool-layout/tool-layout.component');
  const languageImports = SCAFFOLD_LANGUAGE_CODES.map(
    (code) => `import ${languageImportIdentifier(code)} from './i18n/${code}';`,
  ).join('\n');
  const translationLoaders = SCAFFOLD_LANGUAGE_CODES.map(
    (code) => `${objectKey(code)}: () => ${languageImportIdentifier(code)}`,
  ).join(', ');

  return `import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ToolLayoutComponent } from '${toolLayout}';
import { provideTranslation, ScopedTranslationService } from '${coreI18n}';
${languageImports}

@Component({
  selector: 'app-${options.id}',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent],
  providers: [provideTranslation({ ${translationLoaders} })],
  templateUrl: './${options.id}.component.html',
  styleUrl: './${options.id}.component.css',
})
export class ${className} {
  readonly isWidget = input<boolean>(false);
  readonly widgetConfig = input<Record<string, unknown> | null>(null);

  readonly t = inject(ScopedTranslationService);
}
`;
}

export function moduleTemplate(options: ModuleScaffoldOptions): string {
  return `@if (!isWidget()) {
  <app-tool-layout toolId="${options.id}">
    <section class="scaffold-module">
      <span class="material-symbols-outlined" aria-hidden="true">${options.icon}</span>
      <h1>{{ t.map()['TITLE'] }}</h1>
      <p>{{ t.map()['DESCRIPTION'] }}</p>
    </section>
  </app-tool-layout>
} @else {
  <div class="scaffold-widget">
    <strong>{{ t.map()['TITLE'] }}</strong>
    <span>{{ t.map()['WIDGET_COPY'] }}</span>
  </div>
}
`;
}

export function moduleCssTemplate(): string {
  return `.scaffold-module,
.scaffold-widget {
  display: grid;
  gap: 0.75rem;
  place-items: center;
  min-height: 18rem;
  padding: 2rem;
  text-align: center;
}

.scaffold-module .material-symbols-outlined {
  font-size: 3rem;
}
`;
}

export function moduleKernelTemplate(options: ModuleScaffoldOptions): string {
  const prefix = pascalCase(options.id);
  return `export interface ${prefix}Input {
  value?: string;
}

export interface ${prefix}Output {
  ok: true;
  value: string;
}

export function run${prefix}(input: ${prefix}Input = {}): ${prefix}Output {
  return {
    ok: true,
    value: input.value ?? '',
  };
}
`;
}

export function moduleContractTemplate(options: ModuleScaffoldOptions): string {
  const moduleDir = repoPath(options.contentRoot, options.id);
  const moduleContract = relativeImport(moduleDir, 'src/core/module-contract');
  const traits = relativeImport(moduleDir, 'src/core/types/traits');
  const mapper = relativeImport(moduleDir, 'src/core/i18n-mapper');
  const tags = options.tags.map((tag) => `'${escapeSingleQuoted(tag)}'`).join(', ');

  return `import { ModuleContract } from '${moduleContract}';
import { TRAITS } from '${traits}';
import { mapLocalizedField } from '${mapper}';
import { contractI18n } from './i18n/contract.i18n';

export const contract: ModuleContract = {
  id: '${escapeSingleQuoted(options.id)}',
  metadata: {
    appName: '${options.appId}',
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: '${escapeSingleQuoted(options.icon)}',
    version: '0.1.0',
    categories: ['${escapeSingleQuoted(options.category)}'],
    tags: [${tags}],
    color: '${escapeSingleQuoted(options.color)}',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: false,
  },
  cost: 'low',
};
`;
}

export function moduleContractI18nTemplate(options: ModuleScaffoldOptions): string {
  const name = escapeSingleQuoted(options.name);
  const description = escapeSingleQuoted(options.description);
  const entries = SCAFFOLD_LANGUAGE_CODES.map(
    (code) =>
      `  ${objectKey(code)}: {\n    name: '${name}',\n    description: '${description}',\n  }`,
  ).join(',\n');

  return `export const contractI18n = {
${entries}
} as const;
`;
}

export function moduleRuntimeI18nTemplate(options: ModuleScaffoldOptions): string {
  const name = escapeSingleQuoted(options.name);
  const description = escapeSingleQuoted(options.description);
  return `export default {
  TITLE: '${name}',
  DESCRIPTION: '${description}',
  WIDGET_COPY: 'Open the full ${moduleNoun(options.kind)} view.',
};
`;
}

export function moduleIndexTemplate(options: ModuleScaffoldOptions): string {
  const className = `${pascalCase(options.id)}Component`;
  return `import type { Type } from '@angular/core';
import { contract } from './${options.id}.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./${options.id}.component').then((module) => module.${className});
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./${options.id}.kernel');
}
`;
}
