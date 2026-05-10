import type { ToolSpaceDefinition } from '../../../core/tool-space';
import { contractI18n } from './i18n/contract.i18n';
import { mapLocalizedField, mapLocalizedNestedField } from '../../../core/i18n-mapper';

export const healthToolSpaceContract: ToolSpaceDefinition = {
  id: 'health',
  appName: 'utildex',
  name: mapLocalizedField(contractI18n, 'name'),
  description: mapLocalizedField(contractI18n, 'description'),
  icon: 'health_and_safety',
  groups: [
    {
      id: 'body-composition',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'bodyComposition'),
      toolIds: ['bmi-calculator', 'whr-calculator', 'bai-calculator', 'body-fat-deurenberg'],
    },
    {
      id: 'metabolic-indices',
      label: mapLocalizedNestedField(contractI18n, 'groups', 'metabolic'),
      toolIds: ['homa-calculator'],
    },
  ],
};
