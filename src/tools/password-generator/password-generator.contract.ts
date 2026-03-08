import { ToolContract } from '../../core/tool-contract';

export const contract: ToolContract = {
  id: 'password-generator',
  metadata: {
    name: {
      en: 'Password Generator',
      fr: 'Generateur de Mots de Passe',
      es: 'Generador de Contrasenas',
      zh: '密码生成器',
    },
    description: {
      en: 'Create secure, random passwords with customizable length and character sets.',
      fr: 'Creez des mots de passe aleatoires et securises avec une longueur et des jeux de caracteres personnalisables.',
      es: 'Cree contrasenas seguras y aleatorias con longitud y juegos de caracteres personalizables.',
      zh: '创建安全、随机的密码，支持自定义长度和字符集。',
    },
    icon: 'key',
    version: '1.1.0',
    categories: ['Utility', 'Security'],
    tags: ['security', 'password', 'random'],
    featured: true,
    color: '#10b981',
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
      { label: { en: 'Standard', fr: 'Standard', es: 'Estandar', zh: '标准' }, cols: 2, rows: 1 },
      { label: { en: 'Compact', fr: 'Compact', es: 'Compacto', zh: '紧凑' }, cols: 1, rows: 1 },
    ],
  },
  cost: 'low',
};
