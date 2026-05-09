import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';

export const contract: ToolContract = {
  id: 'sudoku',
  metadata: {
    appName: 'synedex',
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'grid_3x3',
    version: '0.1.0',
    categories: ['Cognition'],
    tags: ['sudoku', 'logic', 'puzzle'],
    color: '#0f766e',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: false,
  },
  cost: 'low',
};
