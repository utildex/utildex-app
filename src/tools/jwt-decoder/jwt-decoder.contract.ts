import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'jwt-decoder',
  metadata: {
    name: {
      en: 'JWT Decoder',
      fr: 'Décodeur JWT',
      es: 'Decodificador JWT',
      zh: 'JWT 解码器',
    },
    description: {
      en: 'Decode and inspect JSON Web Tokens (JWT) instantly, including header, payload, and time-based claims. No data leaves your device. Works fully offline; feel free to disconnect.',
      fr: 'Décodez et inspectez instantanément les JSON Web Tokens (JWT), y compris le header, le payload et les claims temporelles. Aucune donnée ne quitte votre appareil. Fonctionne entièrement hors ligne; vous pouvez couper internet.',
      es: 'Decodifica e inspecciona JSON Web Tokens (JWT) al instante, incluyendo header, payload y claims temporales. Ningún dato sale de su dispositivo. Funciona completamente sin conexión; puede desconectar internet.',
      zh: '即时解码并检查 JSON Web Token (JWT)，包括头部、载荷和时间相关声明。数据不会离开你的设备。完全离线运行；你可以断开网络。',
    },
    icon: 'verified_user',
    version: '1.0.0',
    categories: ['Security', 'Developer'],
    tags: ['jwt', 'json web token', 'decode', 'token', 'auth', 'security'],
    featured: true,
    color: '#0891b2',
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
    ],
  },
  cost: 'low',
};
