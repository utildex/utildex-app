export type PageSize = 'fit' | 'a4' | 'letter';

export interface ImageInput {
  data: ArrayBuffer;
  mimeType: string;
}

export interface ImgToPdfConfig {
  pageSize: PageSize;
  margin: number;
}

export async function imagesToPdf(
  images: ImageInput[],
  config: ImgToPdfConfig,
): Promise<Uint8Array> {
  const { PDFDocument, PageSizes } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    let embeddedImage;

    if (img.mimeType === 'image/jpeg') {
      embeddedImage = await pdfDoc.embedJpg(img.data);
    } else if (img.mimeType === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(img.data);
    } else {
      try {
        embeddedImage = await pdfDoc.embedPng(img.data);
      } catch {
        continue;
      }
    }

    const imgDims = embeddedImage.scale(1);
    let pageWidth: number;
    let pageHeight: number;

    if (config.pageSize === 'fit') {
      pageWidth = imgDims.width;
      pageHeight = imgDims.height;
    } else if (config.pageSize === 'a4') {
      [pageWidth, pageHeight] = PageSizes.A4;
    } else {
      [pageWidth, pageHeight] = PageSizes.Letter;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    if (config.pageSize === 'fit') {
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgDims.width,
        height: imgDims.height,
      });
    } else {
      const maxWidth = pageWidth - config.margin * 2;
      const maxHeight = pageHeight - config.margin * 2;
      const scale = Math.min(maxWidth / imgDims.width, maxHeight / imgDims.height);
      const w = imgDims.width * scale;
      const h = imgDims.height * scale;

      page.drawImage(embeddedImage, {
        x: (pageWidth - w) / 2,
        y: (pageHeight - h) / 2,
        width: w,
        height: h,
      });
    }
  }

  return pdfDoc.save();
}
