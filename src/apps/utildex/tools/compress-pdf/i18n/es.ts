export default {
  TITLE: 'Comprimir PDF',
  TITLE_SHORT: 'Comprimir',
  DROP_LABEL: 'Suelta un PDF aquí',
  DROP_EXPLICIT: 'Soltar para comprimir',
  BTN_COMPRESS: 'Comprimir PDF',
  BTN_COMPRESS_SHORT: 'Comprimir',
  BTN_RESET: 'Restablecer',
  BTN_DOWNLOAD: 'Descargar comprimido',
  MODE_STANDARD: 'Estándar',
  MODE_IMAGE_OPTIMIZE: 'Optim. imágenes',
  MODE_MAXIMUM: 'Máximo',
  MODE_STANDARD_DESC:
    'Elimina metadatos y optimiza la estructura. Conserva todo, incluyendo texto e imágenes tal cual. Ideal para PDF con mucho texto.',
  MODE_IMAGE_OPTIMIZE_DESC:
    'Recomprime imágenes incrustadas a JPEG y preserva el texto como una capa invisible buscable. Reduce drásticamente PDF con muchas imágenes manteniendo el texto seleccionable.',
  MODE_MAXIMUM_DESC:
    'Rasteriza todas las páginas como imágenes JPEG. Archivos más pequeños posibles, pero el texto no será seleccionable. Ideal para documentos escaneados.',
  QUALITY: 'Calidad',
  QUALITY_SMALLER: 'Archivo más pequeño',
  QUALITY_BETTER: 'Mejor calidad',
  ORIGINAL_SIZE: 'Original',
  COMPRESSED_SIZE: 'Comprimido',
  RATIO: 'Ahorrado',
  PROCESSING: 'Comprimiendo...',
  SUCCESS: '¡Compresión completada!',
  ERR_INVALID: 'Tipo de archivo inválido. Solo se permiten PDF.',
  ERR_NO_FILE: 'Ningún archivo seleccionado.',
};
