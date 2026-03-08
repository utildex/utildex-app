import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'my-new-tool',
  metadata: {
    name: { en: 'My New Tool', fr: 'Mon Nouvel Outil' },
    description: {
      en: 'A short description of what this tool does.',
      fr: 'Une courte description de ce que fait cet outil.',
    },
    icon: 'construction',
    version: '1.0.0',
    categories: ['Utility'],
    tags: ['template', 'example'],
    color: '#64748b',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 1,
  },
  cost: 'low',
};
