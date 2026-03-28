import { ToolContract } from './tool-contract';

export interface CoreRegistryEntry {
  contract: () => Promise<ToolContract>;
  kernel: () => Promise<Record<string, unknown>>;
}

export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  'base64-encoder-decoder': {
    contract: () =>
      import('../tools/base64-encoder-decoder/base64-encoder-decoder.contract').then(
        (m) => m.contract,
      ),
    kernel: () => import('../tools/base64-encoder-decoder/base64-encoder-decoder.kernel'),
  },
  'code-snippet-viewer': {
    contract: () =>
      import('../tools/code-snippet-viewer/code-snippet-viewer.contract').then((m) => m.contract),
    kernel: () => import('../tools/code-snippet-viewer/code-snippet-viewer.kernel'),
  },
  'diff-checker': {
    contract: () => import('../tools/diff-checker/diff-checker.contract').then((m) => m.contract),
    kernel: () => import('../tools/diff-checker/diff-checker.kernel'),
  },
  'hash-generator': {
    contract: () =>
      import('../tools/hash-generator/hash-generator.contract').then((m) => m.contract),
    kernel: () => import('../tools/hash-generator/hash-generator.kernel'),
  },
  'image-converter': {
    contract: () =>
      import('../tools/image-converter/image-converter.contract').then((m) => m.contract),
    kernel: () => import('../tools/image-converter/image-converter.kernel'),
  },
  'image-resizer': {
    contract: () => import('../tools/image-resizer/image-resizer.contract').then((m) => m.contract),
    kernel: () => import('../tools/image-resizer/image-resizer.kernel'),
  },
  'img-to-pdf': {
    contract: () => import('../tools/img-to-pdf/img-to-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/img-to-pdf/img-to-pdf.kernel'),
  },
  'json-formatter': {
    contract: () =>
      import('../tools/json-formatter/json-formatter.contract').then((m) => m.contract),
    kernel: () => import('../tools/json-formatter/json-formatter.kernel'),
  },
  'jwt-decoder': {
    contract: () => import('../tools/jwt-decoder/jwt-decoder.contract').then((m) => m.contract),
    kernel: () => import('../tools/jwt-decoder/jwt-decoder.kernel'),
  },
  'lorem-ipsum': {
    contract: () => import('../tools/lorem-ipsum/lorem-ipsum.contract').then((m) => m.contract),
    kernel: () => import('../tools/lorem-ipsum/lorem-ipsum.kernel'),
  },
  'markdown-preview': {
    contract: () =>
      import('../tools/markdown-preview/markdown-preview.contract').then((m) => m.contract),
    kernel: () => import('../tools/markdown-preview/markdown-preview.kernel'),
  },
  'merge-pdf': {
    contract: () => import('../tools/merge-pdf/merge-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/merge-pdf/merge-pdf.kernel'),
  },
  'password-generator': {
    contract: () =>
      import('../tools/password-generator/password-generator.contract').then((m) => m.contract),
    kernel: () => import('../tools/password-generator/password-generator.kernel'),
  },
  'pdf-to-img': {
    contract: () => import('../tools/pdf-to-img/pdf-to-img.contract').then((m) => m.contract),
    kernel: () => import('../tools/pdf-to-img/pdf-to-img.kernel'),
  },
  'qr-studio': {
    contract: () => import('../tools/qr-studio/qr-studio.contract').then((m) => m.contract),
    kernel: () => import('../tools/qr-studio/qr-studio.kernel'),
  },
  'rotate-pdf': {
    contract: () => import('../tools/rotate-pdf/rotate-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/rotate-pdf/rotate-pdf.kernel'),
  },
  'simple-2d-plots': {
    contract: () =>
      import('../tools/simple-2d-plots/simple-2d-plots.contract').then((m) => m.contract),
    kernel: () => import('../tools/simple-2d-plots/simple-2d-plots.kernel'),
  },
  'split-pdf': {
    contract: () => import('../tools/split-pdf/split-pdf.contract').then((m) => m.contract),
    kernel: () => import('../tools/split-pdf/split-pdf.kernel'),
  },
  'unit-converter': {
    contract: () =>
      import('../tools/unit-converter/unit-converter.contract').then((m) => m.contract),
    kernel: () => import('../tools/unit-converter/unit-converter.kernel'),
  },
  'url-encoder-decoder': {
    contract: () =>
      import('../tools/url-encoder-decoder/url-encoder-decoder.contract').then((m) => m.contract),
    kernel: () => import('../tools/url-encoder-decoder/url-encoder-decoder.kernel'),
  },
};
