import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'simple-2d-plots',
  metadata: {
    name: {
      en: 'Simple 2D Plots',
      fr: 'Graphiques 2D Simples',
      es: 'Graficos 2D Simples',
      zh: '简单二维绘图',
    },
    description: {
      en: 'Create clean 2D line plots from JSON data with single-series, multi-series, and styled presets plus export options. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Creez des graphiques 2D propres depuis des donnees JSON avec des presets serie unique, multi-serie et styles, ainsi que des options dexport. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Crea graficos 2D limpios a partir de datos JSON con presets de serie unica, multi-serie y estilos, ademas de opciones de exportacion. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '使用 JSON 数据创建清晰的二维折线图，支持单序列、多序列和样式化预设，并可导出。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'timeline',
    version: '1.0.0',
    categories: ['Developer', 'Data'],
    tags: ['plot', 'chart', '2d', 'json', 'visualization', 'graph'],
    featured: false,
    color: '#0ea5e9',
  },
  types: {
    input: { traits: [TRAITS.text, TRAITS.structured] },
    output: { format: 'json' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Compact' }, cols: 1, rows: 1 },
      { label: { en: 'Standard' }, cols: 2, rows: 2 },
      { label: { en: 'Wide' }, cols: 3, rows: 2 },
    ],
  },
  cost: 'low',
};
