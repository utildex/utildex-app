import type { NodeDefinition } from '../../core/pipeline/types';
import type { ImageInput } from './processor';

export const IMG_TO_PDF_NODE: NodeDefinition = {
  toolId: 'img-to-pdf',
  inputs: [
    {
      id: 'images',
      label: 'Images',
      type: 'blob',
      format: ['image/png', 'image/jpeg', 'image/webp'],
      array: true,
      required: true,
    },
  ],
  outputs: [{ id: 'pdf', label: 'PDF Document', type: 'blob', format: 'application/pdf' }],
  loadProcessor: () =>
    import('./processor').then(({ imagesToPdf }) => async (inputs, config) => {
      const rawImages = inputs['images'] as (Blob | ImageInput)[];
      // Normalise: Blob → ImageInput
      const images: ImageInput[] = await Promise.all(
        rawImages.map(async (item) => {
          if (item instanceof Blob) {
            return { data: await item.arrayBuffer(), mimeType: item.type || 'image/png' };
          }
          return item;
        }),
      );
      const pdfBytes = await imagesToPdf(images, {
        pageSize: (config['pageSize'] ?? 'a4') as 'fit' | 'a4' | 'letter',
        margin: Number(config['margin'] ?? 20),
      });
      return { pdf: new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }) };
    }),
};
