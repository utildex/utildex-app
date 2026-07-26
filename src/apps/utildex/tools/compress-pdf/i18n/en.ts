export default {
  TITLE: 'Compress PDF',
  TITLE_SHORT: 'Compress',
  DROP_LABEL: 'Drop a PDF here',
  DROP_EXPLICIT: 'Drop PDF to compress',
  BTN_COMPRESS: 'Compress PDF',
  BTN_COMPRESS_SHORT: 'Compress',
  BTN_RESET: 'Reset',
  BTN_DOWNLOAD: 'Download Compressed',
  MODE_STANDARD: 'Standard',
  MODE_IMAGE_OPTIMIZE: 'Image Optimize',
  MODE_MAXIMUM: 'Maximum',
  MODE_STANDARD_DESC:
    'Strips metadata and optimizes structure. Preserves everything including text and images as-is. Best for text-heavy PDFs.',
  MODE_IMAGE_OPTIMIZE_DESC:
    'Recompresses embedded images to JPEG and preserves text as an invisible searchable layer. Dramatically reduces image-heavy PDFs while keeping text selectable.',
  MODE_MAXIMUM_DESC:
    'Rasterizes all pages to JPEG images. Smallest possible files, but text becomes non-selectable. Best for scanned documents or when file size matters most.',
  QUALITY: 'Quality',
  QUALITY_SMALLER: 'Smaller file',
  QUALITY_BETTER: 'Better quality',
  ORIGINAL_SIZE: 'Original',
  COMPRESSED_SIZE: 'Compressed',
  RATIO: 'Saved',
  PROCESSING: 'Compressing...',
  SUCCESS: 'Compression Complete!',
  ERR_INVALID: 'Invalid file type. Only PDFs allowed.',
  ERR_NO_FILE: 'No file selected.',
};
