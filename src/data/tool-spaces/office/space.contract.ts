import type { ToolSpaceDefinition } from '../../../core/tool-space';

export const officeToolSpaceContract: ToolSpaceDefinition = {
  id: 'office',
  name: {
    en: 'Office Space',
    fr: 'Espace bureautique',
    es: 'Espacio de oficina',
    zh: '办公空间',
  },
  description: {
    en: 'Merge, split, and convert documents for everyday office tasks.',
    fr: 'Fusionnez, separez et convertissez des documents pour les taches bureautiques du quotidien.',
    es: 'Fusiona, divide y convierte documentos para tareas de oficina del dia a dia.',
    zh: '面向日常办公任务的文档合并、拆分与格式转换工作流。',
  },
  icon: 'work',
  groups: [
    {
      id: 'pdf-workflow',
      label: {
        en: 'PDF Workflow',
        fr: 'Flux PDF',
        es: 'Flujo PDF',
        zh: 'PDF 工作流',
      },
      toolIds: ['merge-pdf', 'split-pdf', 'rotate-pdf', 'img-to-pdf', 'pdf-to-img'],
    },
    {
      id: 'productivity',
      label: {
        en: 'Productivity Helpers',
        fr: 'Outils de productivite',
        es: 'Ayudas de productividad',
        zh: '效率工具',
      },
      toolIds: ['lorem-ipsum', 'qr-studio', 'unit-converter'],
    },
  ],
};
