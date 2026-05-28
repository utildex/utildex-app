import type {
  SandboxBootContext,
  SessionBackendAdapter,
  TerminalBackendFeature,
  TerminalSessionCreateRequest,
} from './session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionHandle,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
  TerminalSize,
} from './terminal-session.contract';
import {
  MINIMAL_DEBIAN_RUNTIME_MANIFEST,
  type DebianRuntimeManifest,
} from './debian-runtime.contract';
import { type DebianRuntimeClient } from './debian-worker-client';
import { CheerpXDebianRuntimeClient } from './cheerpx-runtime-client';

type OutputListener = (chunk: TerminalOutputChunk) => void;
type ExitListener = (event: TerminalExitEvent) => void;

const DEFAULT_SIZE: TerminalSize = { cols: 80, rows: 24 };

class DebianTerminalSessionHandle implements TerminalSessionHandle {
  private session: TerminalSessionSnapshot;
  private readonly outputBacklog: TerminalOutputChunk[] = [];
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  constructor(
    session: TerminalSessionSnapshot,
    private readonly client: DebianRuntimeClient,
  ) {
    this.session = session;
  }

  get id(): TerminalSessionId {
    return this.session.id;
  }

  get tabId(): string {
    return this.session.tabId;
  }

  getStatus(): TerminalSessionStatus {
    return this.session.status;
  }

  snapshot(): TerminalSessionSnapshot {
    return this.session;
  }

  async writeInput(input: string): Promise<void> {
    if (this.session.status !== 'ready') {
      this.receiveOutput({
        sessionId: this.id,
        stream: 'stderr',
        text: 'Session is not ready.',
        at: Date.now(),
      });
      return;
    }

    await this.client.writeInput(this.id, input);
  }

  async resize(size: TerminalSize): Promise<void> {
    await this.client.resize(this.id, size);
    this.session = { ...this.session, size };
  }

  async dispose(reason = 'disposed'): Promise<void> {
    await this.client.closeSession(this.id, reason);
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.add(listener);
    for (const chunk of this.outputBacklog.splice(0)) {
      listener(chunk);
    }
    return () => this.outputListeners.delete(listener);
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  receiveOutput(chunk: TerminalOutputChunk): void {
    if (this.outputListeners.size === 0) {
      this.outputBacklog.push(chunk);
      return;
    }

    for (const listener of this.outputListeners) {
      listener(chunk);
    }
  }

  receiveExit(event: TerminalExitEvent): void {
    this.session = {
      ...this.session,
      status: 'exited',
      exitedAt: event.at,
    };

    for (const listener of this.exitListeners) {
      listener(event);
    }
  }
}

export class DebianSessionBackendAdapter implements SessionBackendAdapter {
  readonly id = 'debian-session-backend';

  private booted = false;
  private sequence = 0;
  private readonly sessions = new Map<TerminalSessionId, DebianTerminalSessionHandle>();

  constructor(
    readonly manifest: DebianRuntimeManifest = MINIMAL_DEBIAN_RUNTIME_MANIFEST,
    private readonly client: DebianRuntimeClient = new CheerpXDebianRuntimeClient(),
  ) {
    this.client.onOutput((chunk) => this.sessions.get(chunk.sessionId)?.receiveOutput(chunk));
    this.client.onExit((event) => {
      this.sessions.get(event.sessionId)?.receiveExit(event);
      this.sessions.delete(event.sessionId);
    });
  }

  get version(): string {
    return this.manifest.version;
  }

  async boot(context: SandboxBootContext): Promise<void> {
    if (!context.offlineOnly || !this.manifest.offlineOnly) {
      throw new Error('Debian runtime v1 must boot in offline-only mode.');
    }

    await this.client.boot(context, this.manifest);
    this.booted = true;
  }

  async createSession(request: TerminalSessionCreateRequest): Promise<TerminalSessionHandle> {
    if (!this.booted) {
      throw new Error('Debian session backend must boot before creating sessions.');
    }

    this.sequence += 1;
    const sessionId = `${this.manifest.id}-session-${this.sequence}`;
    const created = await this.client.createSession(request, sessionId, DEFAULT_SIZE);
    const handle = new DebianTerminalSessionHandle(created.session, this.client);

    this.sessions.set(sessionId, handle);
    for (const chunk of created.output) {
      handle.receiveOutput(chunk);
    }
    return handle;
  }

  getSession(sessionId: TerminalSessionId): TerminalSessionHandle | null {
    return this.sessions.get(sessionId) ?? null;
  }

  listSessions(): readonly TerminalSessionSnapshot[] {
    return Array.from(this.sessions.values()).map((session) => session.snapshot());
  }

  async closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void> {
    await this.sessions.get(sessionId)?.dispose(reason);
    this.sessions.delete(sessionId);
  }

  async dispose(): Promise<void> {
    await this.client.dispose();
    this.sessions.clear();
    this.booted = false;
  }

  supports(feature: TerminalBackendFeature): boolean {
    return feature === 'plugin-hooks' || feature === 'multi-tab';
  }
}
