import { ToolContract } from '../../core/tool-contract';

export const contract: ToolContract = {
  id: 'lorem-ipsum',
  metadata: {
    name: { en: 'Lorem Ipsum', fr: 'Lorem Ipsum', es: 'Lorem Ipsum', zh: 'Lorem Ipsum' },
    description: {
      en: 'Generate placeholder text for your designs with adjustable paragraph counts.',
      fr: 'Generez du texte de remplissage pour vos designs avec un nombre de paragraphes ajustable.',
      es: 'Genere texto de relleno para sus disenos con un recuento de parrafos ajustable.',
      zh: '生成带有可调节段落数量的占位符文本，用于您的设计。',
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
