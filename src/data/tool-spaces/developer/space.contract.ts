import type { ToolSpaceDefinition } from '../../../core/tool-space';

export const developerToolSpaceContract: ToolSpaceDefinition = {
  id: 'developer',
  name: {
    en: 'Developer Space',
    fr: 'Espace developpeur',
    es: 'Espacio de desarrollo',
    zh: '开发者空间',
  },
  description: {
    en: 'Format payloads, inspect tokens, and transform data while you code.',
    fr: 'Formatez des donnees, inspectez des jetons et transformez des contenus pendant le developpement.',
    es: 'Formatea datos, inspecciona tokens y transforma contenido mientras desarrollas.',
    zh: '在开发流程中快速完成数据格式化、令牌解析与内容转换。',
  },
  icon: 'terminal',
  groups: [
    {
      id: 'code-and-markup',
      label: {
        en: 'Code and Markup',
        fr: 'Code et balisage',
        es: 'Codigo y marcado',
        zh: '代码与标记',
      },
      toolIds: ['json-formatter', 'diff-checker', 'markdown-preview'],
    },
    {
      id: 'encoding-and-tokens',
      label: {
        en: 'Encoding and Tokens',
        fr: 'Encodage et jetons',
        es: 'Codificacion y tokens',
        zh: '编码与令牌',
      },
      toolIds: ['base64-encoder-decoder', 'url-encoder-decoder', 'jwt-decoder', 'hash-generator'],
    },
    {
      id: 'dev-utilities',
      label: {
        en: 'Developer Utilities',
        fr: 'Utilitaires developpeur',
        es: 'Utilidades de desarrollo',
        zh: '开发辅助工具',
      },
      toolIds: ['code-snippet-viewer', 'simple-2d-plots'],
    },
  ],
};
