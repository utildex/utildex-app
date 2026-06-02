/**
 * Module Registry Source â€” maps module IDs to their component, contract, and kernel.
 */

import { Type } from '@angular/core';
import { ModuleContract } from '../../core/module-contract';
import { getCoreRegistryForApp } from './core-registry';
import { getAppId, type AppId } from '../../core/app.config';
import type { ModuleKind } from '../../core/app-catalog';

export interface ModuleRegistrySourceEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  /** Lazy loader for the Angular component (UI layer). */
  component: () => Promise<Type<unknown>>;
  /** Lazy loader for the module contract (metadata + type contract). */
  contract: () => Promise<ModuleContract>;
  /** Lazy loader for the kernel (pure transformation logic). */
  kernel: () => Promise<Record<string, unknown>>;
}

type ComponentLoader = () => Promise<Type<unknown>>;

const MODULE_COMPONENT_LOADERS: Record<string, ComponentLoader> = {
  'base64-encoder-decoder': () =>
    import('./tools/base64-encoder-decoder/base64-encoder-decoder.component').then(
      (m) => m.Base64EncoderDecoderComponent,
    ),
  'code-snippet-viewer': () =>
    import('./tools/code-snippet-viewer/code-snippet-viewer.component').then(
      (m) => m.CodeSnippetViewerComponent,
    ),
  'diff-checker': () =>
    import('./tools/diff-checker/diff-checker.component').then((m) => m.DiffCheckerComponent),
  'hash-generator': () =>
    import('./tools/hash-generator/hash-generator.component').then((m) => m.HashGeneratorComponent),
  'bmi-calculator': () =>
    import('./tools/bmi-calculator/bmi-calculator.component').then((m) => m.BmiCalculatorComponent),
  'whr-calculator': () =>
    import('./tools/whr-calculator/whr-calculator.component').then((m) => m.WhrCalculatorComponent),
  'bai-calculator': () =>
    import('./tools/bai-calculator/bai-calculator.component').then((m) => m.BaiCalculatorComponent),
  'body-fat-deurenberg': () =>
    import('./tools/body-fat-deurenberg/body-fat-deurenberg.component').then(
      (m) => m.BodyFatDeurenbergComponent,
    ),
  'absi-calculator': () =>
    import('./tools/absi-calculator/absi-calculator.component').then(
      (m) => m.AbsiCalculatorComponent,
    ),
  'homa-calculator': () =>
    import('./tools/homa-calculator/homa-calculator.component').then(
      (m) => m.HomaCalculatorComponent,
    ),
  'image-converter': () =>
    import('./tools/image-converter/image-converter.component').then(
      (m) => m.ImageConverterComponent,
    ),
  'image-resizer': () =>
    import('./tools/image-resizer/image-resizer.component').then((m) => m.ImageResizerComponent),
  'img-to-pdf': () =>
    import('./tools/img-to-pdf/img-to-pdf.component').then((m) => m.ImgToPdfComponent),
  'json-formatter': () =>
    import('./tools/json-formatter/json-formatter.component').then((m) => m.JsonFormatterComponent),
  'jwt-decoder': () =>
    import('./tools/jwt-decoder/jwt-decoder.component').then((m) => m.JwtDecoderComponent),
  'lorem-ipsum': () =>
    import('./tools/lorem-ipsum/lorem-ipsum.component').then((m) => m.LoremIpsumComponent),
  'markdown-preview': () =>
    import('./tools/markdown-preview/markdown-preview.component').then(
      (m) => m.MarkdownPreviewComponent,
    ),
  'merge-pdf': () =>
    import('./tools/merge-pdf/merge-pdf.component').then((m) => m.MergePdfComponent),
  'password-generator': () =>
    import('./tools/password-generator/password-generator.component').then(
      (m) => m.PasswordGeneratorComponent,
    ),
  'pdf-to-img': () =>
    import('./tools/pdf-to-img/pdf-to-img.component').then((m) => m.PdfToImgComponent),
  'qr-studio': () =>
    import('./tools/qr-studio/qr-studio.component').then((m) => m.QrStudioComponent),
  'rotate-pdf': () =>
    import('./tools/rotate-pdf/rotate-pdf.component').then((m) => m.RotatePdfComponent),
  'simple-2d-plots': () =>
    import('./tools/simple-2d-plots/simple-2d-plots.component').then(
      (m) => m.Simple2dPlotsComponent,
    ),
  'split-pdf': () =>
    import('./tools/split-pdf/split-pdf.component').then((m) => m.SplitPdfComponent),
  'unit-converter': () =>
    import('./tools/unit-converter/unit-converter.component').then((m) => m.UnitConverterComponent),
  'url-encoder-decoder': () =>
    import('./tools/url-encoder-decoder/url-encoder-decoder.component').then(
      (m) => m.UrlEncoderDecoderComponent,
    ),
  'date-time-calculator': () =>
    import('./tools/date-time-calculator/date-time-calculator.component').then(
      (m) => m.DateTimeCalculatorComponent,
    ),
  'timezone-converter': () =>
    import('./tools/timezone-converter/timezone-converter.component').then(
      (m) => m.TimezoneConverterComponent,
    ),
  'meeting-time-finder': () =>
    import('./tools/meeting-time-finder/meeting-time-finder.component').then(
      (m) => m.MeetingTimeFinderComponent,
    ),
  'timestamp-converter': () =>
    import('./tools/timestamp-converter/timestamp-converter.component').then(
      (m) => m.TimestampConverterComponent,
    ),
  'time-format-converter': () =>
    import('./tools/time-format-converter/time-format-converter.component').then(
      (m) => m.TimeFormatConverterComponent,
    ),
  'cron-explainer': () =>
    import('./tools/cron-explainer/cron-explainer.component').then((m) => m.CronExplainerComponent),
  'ics-event-generator': () =>
    import('./tools/ics-event-generator/ics-event-generator.component').then(
      (m) => m.IcsEventGeneratorComponent,
    ),
};

function assertContractIdMatchesModuleId(
  moduleId: string,
  contract: ModuleContract,
): ModuleContract {
  if (contract.id !== moduleId) {
    throw new Error(
      `Module contract id mismatch for registry key "${moduleId}": loaded contract.id="${contract.id}"`,
    );
  }

  return contract;
}

function buildModuleRegistrySourceMap(): Record<string, ModuleRegistrySourceEntry> {
  const map: Record<string, ModuleRegistrySourceEntry> = {};
  const coreRegistry = getCoreRegistryForApp(getAppId());

  for (const [moduleId, coreEntry] of Object.entries(coreRegistry)) {
    if (map[moduleId]) {
      throw new Error(`Duplicate module id detected while building registry: ${moduleId}`);
    }

    const component = MODULE_COMPONENT_LOADERS[moduleId];
    if (!component) {
      throw new Error(`Missing Angular component loader for module id: ${moduleId}`);
    }

    const contract = () =>
      coreEntry
        .contract()
        .then((loadedContract) => assertContractIdMatchesModuleId(moduleId, loadedContract));

    map[moduleId] = {
      ...coreEntry,
      component,
      contract,
    };
  }

  for (const moduleId of Object.keys(coreRegistry)) {
    if (!MODULE_COMPONENT_LOADERS[moduleId]) {
      throw new Error(
        `Core registry entry declared without component loader for module id: ${moduleId}`,
      );
    }
  }

  return map;
}

export const MODULE_REGISTRY_SOURCE_MAP: Record<string, ModuleRegistrySourceEntry> =
  buildModuleRegistrySourceMap();
