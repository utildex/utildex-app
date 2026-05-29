import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'minimal-debian-terminal',
  metadata: {
    appName: 'simudex',
    name: {
      en: 'Minimal Debian Terminal',
      fr: 'Terminal Debian minimal',
      es: 'Terminal Debian minimo',
      zh: 'Minimal Debian Terminal',
    },
    description: {
      en: 'Local-only Debian terminal sandbox scaffold for Simudex.',
      fr: 'Socle de bac a sable terminal Debian local pour Simudex.',
      es: 'Base local de terminal Debian aislado para Simudex.',
      zh: 'Local-only Debian terminal sandbox scaffold for Simudex.',
    },
    icon: 'terminal',
    version: '0.1.0',
    categories: ['Simulation', 'Developer'],
    tags: ['debian', 'terminal', 'sandbox', 'linux', 'offline'],
    featured: true,
    color: '#0f766e',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  mcp: {
    compatible: false,
  },
  widget: {
    supported: false,
  },
  cost: 'high',
};
