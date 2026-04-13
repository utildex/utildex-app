import type { ToolSpaceDefinition } from '../../../core/tool-space';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../../core/i18n-mapper';

export const officeToolSpaceContract: ToolSpaceDefinition = {
  id: 'office',
  name: mapLocalizedField(contractI18n, 'name'),
  description: mapLocalizedField(contractI18n, 'description'),
  icon: 'work',
  groups: [
    {
      id: 'pdf-workflow',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'pdfWorkflow'),
      toolIds: ['merge-pdf', 'split-pdf', 'rotate-pdf', 'img-to-pdf', 'pdf-to-img'],
    },
    {
      id: 'productivity',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'productivity'),
      toolIds: ['lorem-ipsum', 'qr-studio', 'unit-converter'],
    },
  ],
};
