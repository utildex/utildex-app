import type { NodeDefinition } from '../../core/pipeline/types';

export const QR_STUDIO_NODE: NodeDefinition = {
  toolId: 'qr-studio',
  inputs: [{ id: 'content', label: 'Content', type: 'text', required: true }],
  outputs: [{ id: 'image', label: 'QR Code Image', type: 'blob', format: 'image/png' }],
  loadProcessor: () =>
    import('./processor').then(({ generateQrBlob }) => async (inputs, config) => {
      const image = await generateQrBlob(String(inputs['content'] ?? ''), {
        errorCorrectionLevel: (config['errorCorrectionLevel'] ?? 'M') as 'L' | 'M' | 'Q' | 'H',
        foreground: String(config['foreground'] ?? '#000000'),
        background: String(config['background'] ?? '#ffffff'),
        width: Number(config['width'] ?? 1024),
      });
      return { image };
    }),
};
