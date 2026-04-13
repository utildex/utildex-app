import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './unit-converter.schema';

export const contract: ToolContract = {
  id: 'unit-converter',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
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
  schema,
  widget: {
    supported: true,
    defaultCols: 1,
    defaultRows: 2,
  },
  cost: 'low',
};
