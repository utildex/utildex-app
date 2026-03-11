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
      en: 'Convert between common units of length, weight, and temperature. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Convertissez entre les unites courantes de longueur, de poids et de temperature. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Convierta entre unidades comunes de longitud, peso y temperatura. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '在长度、重量和温度的常用单位之间进行转换。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
