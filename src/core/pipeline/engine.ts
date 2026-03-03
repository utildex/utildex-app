import { NodeDefinition, Processor, ProcessorContext } from './types';

export interface PipelineNode {
  id: string;
  toolId: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
}

export interface PipelineConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface PipelineGraph {
  nodes: PipelineNode[];
  connections: PipelineConnection[];
}

export interface ExecutionResult {
  nodeId: string;
  outputs: Record<string, unknown>;
  durationMs: number;
}

export type ExecutionStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeExecutionState {
  status: ExecutionStatus;
  progress: number;
  outputs?: Record<string, unknown>;
  error?: string;
}

function topologicalSort(graph: PipelineGraph): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const conn of graph.connections) {
    inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
    adjacency.get(conn.sourceNodeId)?.push(conn.targetNodeId);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== graph.nodes.length) {
    throw new Error('Pipeline contains a cycle');
  }

  return sorted;
}

function gatherInputs(
  nodeId: string,
  graph: PipelineGraph,
  nodeOutputs: Map<string, Record<string, unknown>>,
  nodeDefinitions: Map<string, NodeDefinition>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  const node = graph.nodes.find((n) => n.id === nodeId);
  const def = node ? nodeDefinitions.get(node.toolId) : undefined;

  for (const conn of graph.connections) {
    if (conn.targetNodeId !== nodeId) continue;
    const sourceOut = nodeOutputs.get(conn.sourceNodeId);
    if (sourceOut) {
      let value = sourceOut[conn.sourcePortId];

      // Auto-wrap scalar → array when the target port expects an array
      const targetPort = def?.inputs.find((p) => p.id === conn.targetPortId);
      if (targetPort?.array && !Array.isArray(value) && value !== undefined) {
        value = [value];
      }

      inputs[conn.targetPortId] = value;
    }
  }

  return inputs;
}

/**
 * Validates inputs against port format constraints.
 * Returns an array of error messages (empty if valid).
 */
function validateFormats(inputs: Record<string, unknown>, def: NodeDefinition): string[] {
  const errors: string[] = [];

  for (const port of def.inputs) {
    const value = inputs[port.id];
    if (value === undefined || value === null) {
      if (port.required) {
        errors.push(`Missing required input: ${port.label}`);
      }
      continue;
    }

    // Format check for blobs (validate MIME types)
    if (port.type === 'blob' && port.format) {
      const allowedFormats = Array.isArray(port.format) ? port.format : [port.format];
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (item instanceof Blob) {
          const matches = allowedFormats.some(
            (fmt) => item.type === fmt || item.type.startsWith(fmt.replace('*', '')),
          );
          if (!matches) {
            errors.push(
              `${port.label}: expected ${allowedFormats.join(' or ')}, got ${item.type || 'unknown'}`,
            );
          }
        }
      }
    }
  }

  return errors;
}

export async function executePipeline(
  graph: PipelineGraph,
  nodeDefinitions: Map<string, NodeDefinition>,
  onNodeState: (nodeId: string, state: NodeExecutionState) => void,
  abortSignal: AbortSignal,
): Promise<Map<string, ExecutionResult>> {
  const order = topologicalSort(graph);
  const results = new Map<string, ExecutionResult>();
  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const processorCache = new Map<string, Processor>();

  for (const nodeId of order) {
    if (abortSignal.aborted) throw new Error('Pipeline cancelled');

    const node = graph.nodes.find((n) => n.id === nodeId)!;
    const definition = nodeDefinitions.get(node.toolId);
    if (!definition) throw new Error(`No definition found for tool: ${node.toolId}`);

    onNodeState(nodeId, { status: 'running', progress: 0 });

    if (!processorCache.has(node.toolId)) {
      processorCache.set(node.toolId, await definition.loadProcessor());
    }
    const processor = processorCache.get(node.toolId)!;

    const inputs = gatherInputs(nodeId, graph, nodeOutputs, nodeDefinitions);

    // Validate format constraints before execution
    const formatErrors = validateFormats(inputs, definition);
    if (formatErrors.length > 0) {
      const message = formatErrors.join('; ');
      onNodeState(nodeId, { status: 'error', progress: 0, error: message });
      throw new Error(`Node "${nodeId}" (${node.toolId}) validation failed: ${message}`);
    }

    const ctx: ProcessorContext = {
      signal: abortSignal,
      reportProgress: (percent) => onNodeState(nodeId, { status: 'running', progress: percent }),
    };

    const start = performance.now();
    try {
      const outputs = await processor(inputs, node.config, ctx);
      const durationMs = performance.now() - start;

      nodeOutputs.set(nodeId, outputs);
      results.set(nodeId, { nodeId, outputs, durationMs });
      onNodeState(nodeId, { status: 'done', progress: 100, outputs });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onNodeState(nodeId, { status: 'error', progress: 0, error: message });
      throw new Error(`Node "${nodeId}" (${node.toolId}) failed: ${message}`);
    }
  }

  return results;
}
