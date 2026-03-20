import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'code-snippet-viewer',
  metadata: {
    name: {
      en: 'Code Snippet Viewer',
      fr: 'Visionneuse de Snippets Code',
      es: 'Visor de Snippets de Codigo',
      zh: '代码片段展示器',
    },
    description: {
      en: 'Render code snippets with syntax highlighting, optional beautify, and clean image export. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Affichez des extraits de code avec coloration syntaxique, beautify optionnel et export image propre. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Renderiza fragmentos de codigo con resaltado de sintaxis, beautify opcional y exportacion de imagen limpia. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '使用语法高亮展示代码片段，支持可选美化与干净的图片导出。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'code_blocks',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['code', 'snippet', 'image', 'prism', 'beautify'],
    featured: true,
    color: '#0ea5e9',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'png' },
  },
  widget: {
    supported: false,
  },
  cost: 'low',
};
