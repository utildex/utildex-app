import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../core/i18n-mapper';
import { schema } from './rotate-pdf.schema';

export const contract: ToolContract = {
  id: 'rotate-pdf',
  metadata: {
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'rotate_right',
    version: '1.0.0',
    categories: ['Office', 'Utility'],
    tags: ['pdf', 'rotate', 'turn', 'orientation', 'document'],
    color: '#f59e0b',
  },
  types: {
    input: { traits: [TRAITS.document] },
    output: { format: 'pdf' },
  },
  schema,
  widget: { supported: true, defaultCols: 2, defaultRows: 1 },
  cost: 'medium',
};
