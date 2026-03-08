import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'unit-converter',
  metadata: {
    name: {
      en: 'Unit Converter',
      fr: "Convertisseur d'unites",
      es: 'Convertidor de Unidades',
      zh: '单位转换器',
    },
    description: {
      en: 'Convert between common units of length, weight, and temperature.',
      fr: 'Convertissez entre les unites courantes de longueur, de poids et de temperature.',
      es: 'Convierta entre unidades comunes de longitud, peso y temperatura.',
      zh: '在长度、重量和温度的常用单位之间进行转换。',
    },
    icon: 'scale',
    version: '1.0.0',
    categories: ['Utility', 'Office'],
    tags: ['converter', 'unit', 'length', 'weight', 'temperature'],
    featured: false,
    color: '#f43f5e',
  },
  types: {
    input: { traits: [TRAITS.structured] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 1,
    defaultRows: 2,
  },
  cost: 'low',
};
