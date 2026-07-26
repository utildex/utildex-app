export default {
  TITLE: '压缩 PDF',
  TITLE_SHORT: '压缩',
  DROP_LABEL: '将 PDF 拖放到此处',
  DROP_EXPLICIT: '拖放 PDF 以压缩',
  BTN_COMPRESS: '压缩 PDF',
  BTN_COMPRESS_SHORT: '压缩',
  BTN_RESET: '重置',
  BTN_DOWNLOAD: '下载压缩文件',
  MODE_STANDARD: '标准',
  MODE_IMAGE_OPTIMIZE: '图像优化',
  MODE_MAXIMUM: '最大',
  MODE_STANDARD_DESC:
    '移除元数据并优化结构。保留所有内容，包括文本和图像原样。最适合文本为主的 PDF。',
  MODE_IMAGE_OPTIMIZE_DESC:
    '将嵌入图像重新压缩为 JPEG，并将文本保留为可搜索的不可见图层。大幅减小图像密集型 PDF，同时保持文本可选中。',
  MODE_MAXIMUM_DESC:
    '将所有页面渲染为 JPEG 图像。文件最小，但文本无法选择。最适合扫描文档或需要最小文件大小的情况。',
  QUALITY: '质量',
  QUALITY_SMALLER: '文件更小',
  QUALITY_BETTER: '质量更好',
  ORIGINAL_SIZE: '原始大小',
  COMPRESSED_SIZE: '压缩后大小',
  RATIO: '节省',
  PROCESSING: '压缩中...',
  SUCCESS: '压缩完成！',
  ERR_INVALID: '无效的文件类型。仅允许 PDF 文件。',
  ERR_NO_FILE: '未选择文件。',
};
