import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'hash-generator',
  metadata: {
    name: {
      en: 'Hash Generator',
      fr: 'Generateur de Hash',
      es: 'Generador de Hash',
      zh: '哈希生成器',
    },
    description: {
      en: 'Calculate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Calculez des hachages MD5, SHA-1, SHA-256, SHA-384, SHA-512 a partir de texte ou de fichiers. Aucune donnee ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Calcula hashes MD5, SHA-1, SHA-256, SHA-384, SHA-512 desde texto o archivos. Ningun dato sale de su dispositivo. Funciona completamente sin conexion; puede desconectar internet.',
      zh: '从文本或文件计算 MD5、SHA-1、SHA-256、SHA-384、SHA-512 哈希值。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'fingerprint',
    version: '1.0.0',
    categories: ['Security', 'Developer'],
    tags: ['hash', 'md5', 'sha', 'sha256', 'checksum', 'crypto', 'security'],
    featured: true,
    color: '#6366f1',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 2,
    presets: [
      { label: { en: 'Standard', fr: 'Standard', es: 'Estandar', zh: '标准' }, cols: 2, rows: 2 },
      { label: { en: 'Compact', fr: 'Compact', es: 'Compacto', zh: '紧凑' }, cols: 2, rows: 1 },
    ],
  },
  cost: 'medium',
};
