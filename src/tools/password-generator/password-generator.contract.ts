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
      en: 'Create secure, random passwords with customizable length and character sets. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Créez des mots de passe aléatoires et sécurisés avec une longueur et des jeux de caractères personnalisables. Aucune donnée ne quitte votre appareil. Fonctionne entièrement hors ligne ; vous pouvez couper internet.',
      es: 'Cree contrasenas seguras y aleatorias con longitud y juegos de caracteres personalizables. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '创建安全、随机的密码，支持自定义长度和字符集。数据不会离开你的设备。完全离线运行；你可以断开网络。',
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
