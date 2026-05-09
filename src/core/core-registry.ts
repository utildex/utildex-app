import type { ToolContract } from './tool-contract';
import type { AppId } from './app.config';

export interface CoreRegistryEntry {
  appName?: AppId | 'shared';
  contract: () => Promise<ToolContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  'base64-encoder-decoder': {
    contract: () =>
      import('../utildex-tools/base64-encoder-decoder/base64-encoder-decoder.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('../utildex-tools/base64-encoder-decoder/base64-encoder-decoder.kernel'),
  },
  'code-snippet-viewer': {
    contract: () =>
      import('../utildex-tools/code-snippet-viewer/code-snippet-viewer.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('../utildex-tools/code-snippet-viewer/code-snippet-viewer.kernel'),
  },
  'diff-checker': {
    contract: () =>
      import('../utildex-tools/diff-checker/diff-checker.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/diff-checker/diff-checker.kernel'),
  },
  'hash-generator': {
    contract: () =>
      import('../utildex-tools/hash-generator/hash-generator.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/hash-generator/hash-generator.kernel'),
  },
  'image-converter': {
    contract: () =>
      import('../utildex-tools/image-converter/image-converter.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/image-converter/image-converter.kernel'),
  },
  'image-resizer': {
    contract: () =>
      import('../utildex-tools/image-resizer/image-resizer.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/image-resizer/image-resizer.kernel'),
  },
  'img-to-pdf': {
    contract: () =>
      import('../utildex-tools/img-to-pdf/img-to-pdf.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/img-to-pdf/img-to-pdf.kernel'),
  },
  'json-formatter': {
    contract: () =>
      import('../utildex-tools/json-formatter/json-formatter.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/json-formatter/json-formatter.kernel'),
  },
  'jwt-decoder': {
    contract: () =>
      import('../utildex-tools/jwt-decoder/jwt-decoder.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/jwt-decoder/jwt-decoder.kernel'),
  },
  'lorem-ipsum': {
    contract: () =>
      import('../utildex-tools/lorem-ipsum/lorem-ipsum.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/lorem-ipsum/lorem-ipsum.kernel'),
  },
  'markdown-preview': {
    contract: () =>
      import('../utildex-tools/markdown-preview/markdown-preview.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/markdown-preview/markdown-preview.kernel'),
  },
  'merge-pdf': {
    contract: () => import('../utildex-tools/merge-pdf/merge-pdf.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/merge-pdf/merge-pdf.kernel'),
  },
  'password-generator': {
    contract: () =>
      import('../utildex-tools/password-generator/password-generator.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('../utildex-tools/password-generator/password-generator.kernel'),
  },
  'pdf-to-img': {
    contract: () =>
      import('../utildex-tools/pdf-to-img/pdf-to-img.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/pdf-to-img/pdf-to-img.kernel'),
  },
  'qr-studio': {
    contract: () => import('../utildex-tools/qr-studio/qr-studio.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/qr-studio/qr-studio.kernel'),
  },
  'rotate-pdf': {
    contract: () =>
      import('../utildex-tools/rotate-pdf/rotate-pdf.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/rotate-pdf/rotate-pdf.kernel'),
  },
  'simple-2d-plots': {
    contract: () =>
      import('../utildex-tools/simple-2d-plots/simple-2d-plots.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/simple-2d-plots/simple-2d-plots.kernel'),
  },
  'split-pdf': {
    contract: () => import('../utildex-tools/split-pdf/split-pdf.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/split-pdf/split-pdf.kernel'),
  },
  'unit-converter': {
    contract: () =>
      import('../utildex-tools/unit-converter/unit-converter.contract').then((m) => m.contract),
    kernel: () => import('../utildex-tools/unit-converter/unit-converter.kernel'),
  },
  'url-encoder-decoder': {
    contract: () =>
      import('../utildex-tools/url-encoder-decoder/url-encoder-decoder.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('../utildex-tools/url-encoder-decoder/url-encoder-decoder.kernel'),
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
