import { Injectable, inject, signal, computed, effect } from '@angular/core';
import {
  PipelineGraph,
  PipelineNode,
  PipelineConnection,
  NodeExecutionState,
  executePipeline,
} from './engine';
import { NODE_REGISTRY } from './node-registry';
import { DbService } from '../../services/db.service';
import { STORAGE_KEYS } from '../storage-keys';

const STORAGE_KEY = STORAGE_KEYS.PIPELINE_GRAPH;

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private db = inject(DbService);

  private graph = signal<PipelineGraph>({ nodes: [], connections: [] });
  private nodeStates = signal<Map<string, NodeExecutionState>>(new Map());
  private selectedNodeIds = signal(new Set<string>());
  private abortController: AbortController | null = null;
  private hydrated = false;

  readonly nodes = computed(() => this.graph().nodes);
  readonly connections = computed(() => this.graph().connections);
  readonly states = this.nodeStates.asReadonly();
  readonly selection = this.selectedNodeIds.asReadonly();
  readonly isRunning = computed(() =>
    [...this.nodeStates().values()].some((s) => s.status === 'running'),
  );
  readonly availableNodes = Array.from(NODE_REGISTRY.entries()).map(([toolId, def]) => ({
    toolId,
    label: toolId,
    inputs: def.inputs,
    outputs: def.outputs,
  }));

  constructor() {
    // Hydrate from storage
    this.db.config.read(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
          if (parsed && Array.isArray(parsed.nodes)) {
            this.graph.set(parsed as PipelineGraph);
          }
        } catch {
          /* corrupted — start fresh */
        }
      }
      this.hydrated = true;
    });

    // Persist on graph changes (debounced 500ms)
    effect((onCleanup) => {
      const g = this.graph();
      if (!this.hydrated) return;
      const timer = setTimeout(() => {
        this.db.config.write(STORAGE_KEY, JSON.stringify(g));
      }, 500);
      onCleanup(() => clearTimeout(timer));
    });
  }

  /* ── CRUD ── */

  addNode(toolId: string, x: number, y: number): string {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const node: PipelineNode = { id, toolId, config: {}, x, y };
    this.graph.update((g) => ({ ...g, nodes: [...g.nodes, node] }));
    return id;
  }

  removeNode(nodeId: string) {
    this.graph.update((g) => ({
      nodes: g.nodes.filter((n) => n.id !== nodeId),
      connections: g.connections.filter(
        (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId,
      ),
    }));
  }

  moveNode(nodeId: string, x: number, y: number) {
    this.graph.update((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    }));
  }

  moveNodes(updates: Map<string, { x: number; y: number }>) {
    this.graph.update((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        const u = updates.get(n.id);
        return u ? { ...n, x: u.x, y: u.y } : n;
      }),
    }));
  }

  updateNodeConfig(nodeId: string, config: Record<string, unknown>) {
    this.graph.update((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, config } : n)),
    }));
  }

  /* ── SELECTION ── */

  selectNode(nodeId: string | null, multi = false) {
    this.selectedNodeIds.update((s) => {
      const next = multi ? new Set(s) : new Set<string>();
      if (nodeId) {
        if (multi && next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
      }
      return next;
    });
  }

  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodeIds().has(nodeId);
  }

  deleteSelection() {
    const ids = this.selectedNodeIds();
    if (ids.size > 0) {
      ids.forEach((id) => this.removeNode(id));
      this.selectedNodeIds.set(new Set());
    }
  }

  /* ── CONNECTIONS ── */

  /**
   * Attempts to create a connection. Returns null on success,
   * or a reason string on failure: 'self' | 'duplicate' | 'missing' | 'type' | 'cycle'.
   */
  addConnection(
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
  ): string | null {
    if (sourceNodeId === targetNodeId) return 'self';

    const existing = this.graph().connections.find(
      (c) => c.targetNodeId === targetNodeId && c.targetPortId === targetPortId,
    );
    if (existing) return 'duplicate';

    const sourceNode = this.graph().nodes.find((n) => n.id === sourceNodeId);
    const targetNode = this.graph().nodes.find((n) => n.id === targetNodeId);
    if (!sourceNode || !targetNode) return 'missing';

    const sourceDef = NODE_REGISTRY.get(sourceNode.toolId);
    const targetDef = NODE_REGISTRY.get(targetNode.toolId);
    if (!sourceDef || !targetDef) return 'missing';

    const outPort = sourceDef.outputs.find((p) => p.id === sourcePortId);
    const inPort = targetDef.inputs.find((p) => p.id === targetPortId);
    if (!outPort || !inPort) return 'missing';

    // Type compatibility: 'any' matches everything, otherwise base types must match
    if (outPort.type !== 'any' && inPort.type !== 'any' && outPort.type !== inPort.type)
      return 'type';

    // Cycle detection: DFS from target forward — if it reaches source, reject
    if (this.wouldCreateCycle(sourceNodeId, targetNodeId)) return 'cycle';

    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const conn: PipelineConnection = {
      id,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
    };
    this.graph.update((g) => ({ ...g, connections: [...g.connections, conn] }));
    return null;
  }

  private wouldCreateCycle(sourceNodeId: string, targetNodeId: string): boolean {
    const visited = new Set<string>();
    const stack = [targetNodeId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceNodeId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const conn of this.graph().connections) {
        if (conn.sourceNodeId === current) {
          stack.push(conn.targetNodeId);
        }
      }
    }
    return false;
  }

  /** Check if two ports are type-compatible (for UI highlighting during drag). */
  canConnect(
    sourceToolId: string,
    sourcePortId: string,
    targetToolId: string,
    targetPortId: string,
  ): boolean {
    const sourceDef = NODE_REGISTRY.get(sourceToolId);
    const targetDef = NODE_REGISTRY.get(targetToolId);
    if (!sourceDef || !targetDef) return false;
    const outPort = sourceDef.outputs.find((p) => p.id === sourcePortId);
    const inPort = targetDef.inputs.find((p) => p.id === targetPortId);
    if (!outPort || !inPort) return false;
    return outPort.type === 'any' || inPort.type === 'any' || outPort.type === inPort.type;
  }

  removeConnection(connId: string) {
    this.graph.update((g) => ({
      ...g,
      connections: g.connections.filter((c) => c.id !== connId),
    }));
  }

  /* ── EXECUTION ── */

  async run(configOverrides?: Map<string, Record<string, unknown>>) {
    if (this.isRunning()) return;
    this.nodeStates.set(new Map());
    this.abortController = new AbortController();

    // Merge transient overrides (e.g. file data) into a copy of the graph
    let graph = this.graph();
    if (configOverrides?.size) {
      graph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          const o = configOverrides.get(n.id);
          return o ? { ...n, config: { ...n.config, ...o } } : n;
        }),
      };
    }

    try {
      await executePipeline(
        graph,
        NODE_REGISTRY,
        (nodeId, state) => {
          this.nodeStates.update((m) => {
            const next = new Map(m);
            next.set(nodeId, state);
            return next;
          });
        },
        this.abortController.signal,
      );
    } catch {
      // Per-node errors already tracked via callback
    }
  }

  cancel() {
    this.abortController?.abort();
  }

  clear() {
    this.cancel();
    this.graph.set({ nodes: [], connections: [] });
    this.nodeStates.set(new Map());
  }

  getNodeState(nodeId: string): NodeExecutionState | undefined {
    return this.nodeStates().get(nodeId);
  }

  /** Reset all node execution states (clear results without clearing the graph). */
  resetStates() {
    this.nodeStates.set(new Map());
  }
}
