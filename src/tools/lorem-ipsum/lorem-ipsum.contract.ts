import { ToolContract } from '../../core/tool-contract';

export const contract: ToolContract = {
  id: 'lorem-ipsum',
  metadata: {
    name: { en: 'Lorem Ipsum', fr: 'Lorem Ipsum', es: 'Lorem Ipsum', zh: 'Lorem Ipsum' },
    description: {
      en: 'Generate placeholder text for your designs with adjustable paragraph counts. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Generez du texte de remplissage pour vos designs avec un nombre de paragraphes ajustable. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Genere texto de relleno para sus disenos con un recuento de parrafos ajustable. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '生成带有可调节段落数量的占位符文本。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'description',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['generator', 'text', 'lorem', 'ipsum'],
    color: '#3b82f6',
  },
  types: {
    input: { traits: [] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 1,
    presets: [
      { label: { en: 'Default', fr: 'Defaut', es: 'Por defecto', zh: '默认' }, cols: 2, rows: 1 },
    ],
  },
  cost: 'low',
};
