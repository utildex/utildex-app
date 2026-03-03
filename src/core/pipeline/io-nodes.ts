import type { NodeDefinition } from './types';
import type { I18nText } from '../../data/types';

/* ── Metadata for nodes that aren't real tools ── */

export interface IONodeMeta {
  toolId: string;
  icon: string;
  color: string;
  name: I18nText;
  category: 'input' | 'output' | 'utility';
}

export const IO_META: IONodeMeta[] = [
  {
    toolId: '__input-text__',
    icon: 'text_fields',
    color: '#3b82f6',
    name: { en: 'Text Input', fr: 'Entrée texte', es: 'Entrada de texto', zh: '文本输入' },
    category: 'input',
  },
  {
    toolId: '__input-files__',
    icon: 'upload_file',
    color: '#f59e0b',
    name: { en: 'File Input', fr: 'Entrée fichier', es: 'Entrada de archivo', zh: '文件输入' },
    category: 'input',
  },
  {
    toolId: '__output-download__',
    icon: 'download',
    color: '#10b981',
    name: { en: 'Download', fr: 'Télécharger', es: 'Descargar', zh: '下载' },
    category: 'output',
  },
  {
    toolId: '__bridge__',
    icon: 'commit',
    color: '#94a3b8',
    name: { en: 'Bridge', fr: 'Pont', es: 'Puente', zh: '桥接' },
    category: 'utility',
  },
];

export const IO_META_MAP = new Map(IO_META.map((m) => [m.toolId, m]));

/* ── Node definitions ── */

export const TEXT_INPUT_NODE: NodeDefinition = {
  toolId: '__input-text__',
  inputs: [],
  outputs: [{ id: 'text', label: 'Text', type: 'text' }],
  loadProcessor: () =>
    Promise.resolve((_inputs, config) => Promise.resolve({ text: config['value'] ?? '' })),
};

export const FILE_INPUT_NODE: NodeDefinition = {
  toolId: '__input-files__',
  inputs: [],
  outputs: [{ id: 'files', label: 'Files', type: 'blob', array: true }],
  loadProcessor: () =>
    Promise.resolve((_inputs, config) => Promise.resolve({ files: config['files'] ?? [] })),
};

/* ── Utility Nodes ── */

export const BRIDGE_NODE: NodeDefinition = {
  toolId: '__bridge__',
  inputs: [{ id: 'in', label: 'In', type: 'any' }],
  outputs: [{ id: 'out', label: 'Out', type: 'any' }],
  loadProcessor: () => Promise.resolve((inputs) => Promise.resolve({ out: inputs['in'] })),
};

export const DOWNLOAD_OUTPUT_NODE: NodeDefinition = {
  toolId: '__output-download__',
  inputs: [{ id: 'content', label: 'Content', type: 'any', required: true }],
  outputs: [],
  loadProcessor: () =>
    Promise.resolve((inputs) => {
      // Output nodes just pass data through — the UI handles downloading
      return Promise.resolve({ _result: inputs['content'] });
    }),
};

/** Maximum number of input slots on the collector node */
export const COLLECTOR_MAX_PORTS = 8;

export const IO_NODES: NodeDefinition[] = [
  TEXT_INPUT_NODE,
  FILE_INPUT_NODE,
  BRIDGE_NODE,
  DOWNLOAD_OUTPUT_NODE,
];
