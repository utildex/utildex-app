import { NodeDefinition } from './types';
import { QR_STUDIO_NODE } from '../../tools/qr-studio/node';
import { IMG_TO_PDF_NODE } from '../../tools/img-to-pdf/node';
import { IO_NODES } from './io-nodes';

const ALL_NODES: NodeDefinition[] = [...IO_NODES, QR_STUDIO_NODE, IMG_TO_PDF_NODE];

export const NODE_REGISTRY = new Map<string, NodeDefinition>(ALL_NODES.map((n) => [n.toolId, n]));
