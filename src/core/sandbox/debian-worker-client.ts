import { createRuntimeWorker } from '../runtime-resources';
import type { SandboxBootContext, TerminalSessionCreateRequest } from './session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSize,
} from './terminal-session.contract';
import type {
  DebianRuntimeManifest,
  DebianWorkerRequest,
  DebianWorkerResponse,
} from './debian-runtime.contract';

type PendingRequest = {
  resolve: (response: DebianWorkerResponse) => void;
  reject: (error: Error) => void;
};

type OutputListener = (chunk: TerminalOutputChunk) => void;
type ExitListener = (event: TerminalExitEvent) => void;

export interface DebianRuntimeSessionCreateResult {
  session: TerminalSessionSnapshot;
  output: TerminalOutputChunk[];
}

export interface DebianRuntimeClient {
  boot(context: SandboxBootContext, manifest: DebianRuntimeManifest): Promise<string>;
  createSession(
    request: TerminalSessionCreateRequest,
    sessionId: TerminalSessionId,
    size: TerminalSize,
  ): Promise<DebianRuntimeSessionCreateResult>;
  writeInput(sessionId: TerminalSessionId, input: string): Promise<void>;
  resize(sessionId: TerminalSessionId, size: TerminalSize): Promise<void>;
  closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void>;
  dispose(): Promise<void>;
  onOutput(listener: OutputListener): () => void;
  onExit(listener: ExitListener): () => void;
}

export class BrowserDebianRuntimeClient implements DebianRuntimeClient {
  private worker: Worker | null = null;
  private sequence = 0;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  constructor(
    private readonly workerFactory: () => Worker = () => createRuntimeWorker('simudexDebian'),
  ) {}

  async boot(context: SandboxBootContext, manifest: DebianRuntimeManifest): Promise<string> {
    const response = await this.send({
      id: this.nextRequestId(),
      type: 'boot',
      context,
      manifest,
    });

    if (response.type !== 'booted') {
      throw new Error(`Unexpected Debian worker response: ${response.type}`);
    }

    return response.runtimeVersion;
  }

  async createSession(
    request: TerminalSessionCreateRequest,
    sessionId: TerminalSessionId,
    size: TerminalSize,
  ): Promise<DebianRuntimeSessionCreateResult> {
    const response = await this.send({
      id: this.nextRequestId(),
      type: 'create-session',
      sessionId,
      tabId: request.tabId,
      title: request.title,
      cwd: request.cwd,
      size,
    });

    if (response.type !== 'session-created') {
      throw new Error(`Unexpected Debian worker response: ${response.type}`);
    }

    return {
      session: response.session,
      output: response.output ?? [],
    };
  }

  async writeInput(sessionId: TerminalSessionId, input: string): Promise<void> {
    await this.expectAck({
      id: this.nextRequestId(),
      type: 'write-input',
      sessionId,
      input,
    });
  }

  async resize(sessionId: TerminalSessionId, size: TerminalSize): Promise<void> {
    await this.expectAck({
      id: this.nextRequestId(),
      type: 'resize',
      sessionId,
      size,
    });
  }

  async closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void> {
    await this.expectAck({
      id: this.nextRequestId(),
      type: 'close-session',
      sessionId,
      reason,
    });
  }

  async dispose(): Promise<void> {
    if (!this.worker) return;

    try {
      await this.expectAck({
        id: this.nextRequestId(),
        type: 'dispose',
      });
    } finally {
      this.rejectPending('Debian worker client disposed.');
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.terminate();
      this.worker = null;
    }
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  private async expectAck(request: DebianWorkerRequest): Promise<void> {
    const response = await this.send(request);
    if (response.type !== 'ack') {
      throw new Error(`Unexpected Debian worker response: ${response.type}`);
    }
  }

  private send(request: DebianWorkerRequest): Promise<DebianWorkerResponse> {
    const worker = this.ensureWorker();

    return new Promise((resolve, reject) => {
      this.pending.set(request.id, { resolve, reject });
      worker.postMessage(request);
    });
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.addEventListener('message', this.handleMessage);
    }

    return this.worker;
  }

  private readonly handleMessage = (event: MessageEvent<DebianWorkerResponse>): void => {
    const response = event.data;

    if (response.type === 'output') {
      for (const listener of this.outputListeners) {
        listener(response.chunk);
      }
      return;
    }

    if (response.type === 'session-exit') {
      for (const listener of this.exitListeners) {
        listener(response.event);
      }
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) return;

    this.pending.delete(response.id);
    if (response.type === 'error') {
      pending.reject(new Error(response.error));
      return;
    }

    pending.resolve(response);
  };

  private nextRequestId(): string {
    this.sequence += 1;
    return `debian-worker-request-${this.sequence}`;
  }

  private rejectPending(message: string): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }
}
