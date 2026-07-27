import type { ModuleContract } from '../../core/module-contract';
import type { AppId } from '../../core/app.config';
import type { ModuleKind } from '../../core/app-catalog';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  kind?: ModuleKind;
  contract: () => Promise<ModuleContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  'base64-encoder-decoder': {
    contract: () =>
      import('./tools/base64-encoder-decoder/base64-encoder-decoder.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('./tools/base64-encoder-decoder/base64-encoder-decoder.kernel'),
  },
  'code-snippet-viewer': {
    contract: () =>
      import('./tools/code-snippet-viewer/code-snippet-viewer.contract').then((m) => m.contract),
    kernel: () => import('./tools/code-snippet-viewer/code-snippet-viewer.kernel'),
  },
  'compress-pdf': {
    contract: () => import('./tools/compress-pdf/compress-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/compress-pdf/compress-pdf.kernel'),
  },
  'diff-checker': {
    contract: () => import('./tools/diff-checker/diff-checker.contract').then((m) => m.contract),
    kernel: () => import('./tools/diff-checker/diff-checker.kernel'),
  },
  'hash-generator': {
    contract: () =>
      import('./tools/hash-generator/hash-generator.contract').then((m) => m.contract),
    kernel: () => import('./tools/hash-generator/hash-generator.kernel'),
  },
  'bmi-calculator': {
    contract: () =>
      import('./tools/bmi-calculator/bmi-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/bmi-calculator/bmi-calculator.kernel'),
  },
  'whr-calculator': {
    contract: () =>
      import('./tools/whr-calculator/whr-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/whr-calculator/whr-calculator.kernel'),
  },
  'bai-calculator': {
    contract: () =>
      import('./tools/bai-calculator/bai-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/bai-calculator/bai-calculator.kernel'),
  },
  'body-fat-deurenberg': {
    contract: () =>
      import('./tools/body-fat-deurenberg/body-fat-deurenberg.contract').then((m) => m.contract),
    kernel: () => import('./tools/body-fat-deurenberg/body-fat-deurenberg.kernel'),
  },
  'absi-calculator': {
    contract: () =>
      import('./tools/absi-calculator/absi-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/absi-calculator/absi-calculator.kernel'),
  },
  'homa-calculator': {
    contract: () =>
      import('./tools/homa-calculator/homa-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/homa-calculator/homa-calculator.kernel'),
  },
  'image-converter': {
    contract: () =>
      import('./tools/image-converter/image-converter.contract').then((m) => m.contract),
    kernel: () => import('./tools/image-converter/image-converter.kernel'),
  },
  'image-resizer': {
    contract: () => import('./tools/image-resizer/image-resizer.contract').then((m) => m.contract),
    kernel: () => import('./tools/image-resizer/image-resizer.kernel'),
  },
  'img-to-pdf': {
    contract: () => import('./tools/img-to-pdf/img-to-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/img-to-pdf/img-to-pdf.kernel'),
  },
  'json-formatter': {
    contract: () =>
      import('./tools/json-formatter/json-formatter.contract').then((m) => m.contract),
    kernel: () => import('./tools/json-formatter/json-formatter.kernel'),
  },
  'jwt-decoder': {
    contract: () => import('./tools/jwt-decoder/jwt-decoder.contract').then((m) => m.contract),
    kernel: () => import('./tools/jwt-decoder/jwt-decoder.kernel'),
  },
  'lorem-ipsum': {
    contract: () => import('./tools/lorem-ipsum/lorem-ipsum.contract').then((m) => m.contract),
    kernel: () => import('./tools/lorem-ipsum/lorem-ipsum.kernel'),
  },
  'markdown-preview': {
    contract: () =>
      import('./tools/markdown-preview/markdown-preview.contract').then((m) => m.contract),
    kernel: () => import('./tools/markdown-preview/markdown-preview.kernel'),
  },
  'merge-pdf': {
    contract: () => import('./tools/merge-pdf/merge-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/merge-pdf/merge-pdf.kernel'),
  },
  'password-generator': {
    contract: () =>
      import('./tools/password-generator/password-generator.contract').then((m) => m.contract),
    kernel: () => import('./tools/password-generator/password-generator.kernel'),
  },
  'pdf-to-img': {
    contract: () => import('./tools/pdf-to-img/pdf-to-img.contract').then((m) => m.contract),
    kernel: () => import('./tools/pdf-to-img/pdf-to-img.kernel'),
  },
  'qr-studio': {
    contract: () => import('./tools/qr-studio/qr-studio.contract').then((m) => m.contract),
    kernel: () => import('./tools/qr-studio/qr-studio.kernel'),
  },
  'rotate-pdf': {
    contract: () => import('./tools/rotate-pdf/rotate-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/rotate-pdf/rotate-pdf.kernel'),
  },
  'simple-2d-plots': {
    contract: () =>
      import('./tools/simple-2d-plots/simple-2d-plots.contract').then((m) => m.contract),
    kernel: () => import('./tools/simple-2d-plots/simple-2d-plots.kernel'),
  },
  'split-pdf': {
    contract: () => import('./tools/split-pdf/split-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/split-pdf/split-pdf.kernel'),
  },
  'unit-converter': {
    contract: () =>
      import('./tools/unit-converter/unit-converter.contract').then((m) => m.contract),
    kernel: () => import('./tools/unit-converter/unit-converter.kernel'),
  },
  'uniformize-pdf': {
    contract: () =>
      import('./tools/uniformize-pdf/uniformize-pdf.contract').then((m) => m.contract),
    kernel: () => import('./tools/uniformize-pdf/uniformize-pdf.kernel'),
  },
  'url-encoder-decoder': {
    contract: () =>
      import('./tools/url-encoder-decoder/url-encoder-decoder.contract').then((m) => m.contract),
    kernel: () => import('./tools/url-encoder-decoder/url-encoder-decoder.kernel'),
  },
  'date-time-calculator': {
    contract: () =>
      import('./tools/date-time-calculator/date-time-calculator.contract').then((m) => m.contract),
    kernel: () => import('./tools/date-time-calculator/date-time-calculator.kernel'),
  },
  'timezone-converter': {
    contract: () =>
      import('./tools/timezone-converter/timezone-converter.contract').then((m) => m.contract),
    kernel: () => import('./tools/timezone-converter/timezone-converter.kernel'),
  },
  'meeting-time-finder': {
    contract: () =>
      import('./tools/meeting-time-finder/meeting-time-finder.contract').then((m) => m.contract),
    kernel: () => import('./tools/meeting-time-finder/meeting-time-finder.kernel'),
  },
  'timestamp-converter': {
    contract: () =>
      import('./tools/timestamp-converter/timestamp-converter.contract').then((m) => m.contract),
    kernel: () => import('./tools/timestamp-converter/timestamp-converter.kernel'),
  },
  'time-format-converter': {
    contract: () =>
      import('./tools/time-format-converter/time-format-converter.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('./tools/time-format-converter/time-format-converter.kernel'),
  },
  'cron-explainer': {
    contract: () =>
      import('./tools/cron-explainer/cron-explainer.contract').then((m) => m.contract),
    kernel: () => import('./tools/cron-explainer/cron-explainer.kernel'),
  },
  'ics-event-generator': {
    contract: () =>
      import('./tools/ics-event-generator/ics-event-generator.contract').then((m) => m.contract),
    kernel: () => import('./tools/ics-event-generator/ics-event-generator.kernel'),
  },
};

function belongsToApp(entry: CoreRegistryEntry, appId: AppId): boolean {
  const owner = entry.appName ?? 'utildex';
  return owner === 'shared' || owner === appId;
}

export function getCoreRegistryForApp(appId: AppId): Record<string, CoreRegistryEntry> {
  return Object.fromEntries(
    Object.entries(CORE_REGISTRY).filter(([, entry]) => belongsToApp(entry, appId)),
  );
}
