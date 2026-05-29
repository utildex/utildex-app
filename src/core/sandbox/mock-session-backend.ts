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
  TerminalTabId,
} from './terminal-session.contract';

type OutputListener = (chunk: TerminalOutputChunk) => void;
type ExitListener = (event: TerminalExitEvent) => void;

const DEFAULT_SIZE: TerminalSize = { cols: 80, rows: 24 };

export class MockTerminalSessionHandle implements TerminalSessionHandle {
  private status: TerminalSessionStatus = 'ready';
  private size: TerminalSize = DEFAULT_SIZE;
  private cwd: string;
  private title: string;
  private readonly createdAt = Date.now();
  private readonly startedAt = Date.now();
  private exitedAt: number | undefined;
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  constructor(
    readonly id: TerminalSessionId,
    readonly tabId: TerminalTabId,
    request: TerminalSessionCreateRequest,
  ) {
    this.cwd = request.cwd ?? '/home/student';
    this.title = request.title ?? 'Shell';
    queueMicrotask(() => {
      this.emit('system', `Mock sandbox session ready in ${this.cwd}.`);
      this.emit('system', 'This is a shared terminal platform placeholder; no VM is running yet.');
    });
  }

  getStatus(): TerminalSessionStatus {
    return this.status;
  }

  snapshot(): TerminalSessionSnapshot {
    return {
      id: this.id,
      tabId: this.tabId,
      status: this.status,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      exitedAt: this.exitedAt,
      cwd: this.cwd,
      title: this.title,
      size: this.size,
    };
  }

  async writeInput(input: string): Promise<void> {
    if (this.status !== 'ready') {
      this.emit('stderr', 'Session is not ready.');
      return;
    }

    const command = input.trim();
    if (!command) return;

    this.emit('stdout', `$ ${command}`);

    if (command === 'exit') {
      await this.dispose('exit command');
      return;
    }

    if (command === 'pwd') {
      this.emit('stdout', this.cwd);
      return;
    }

    if (command.startsWith('cd ')) {
      const nextCwd = command.slice(3).trim();
      this.cwd = nextCwd.startsWith('/') ? nextCwd : `${this.cwd}/${nextCwd}`;
      this.emit('system', `cwd: ${this.cwd}`);
      return;
    }

    if (command === 'help') {
      this.emit('stdout', 'Mock commands: help, pwd, cd <path>, clear, exit.');
      return;
    }

    if (command === 'clear') {
      this.emit('system', '[clear requested]');
      return;
    }

    this.emit('stdout', `mock: ${command}`);
  }

  async resize(size: TerminalSize): Promise<void> {
    this.size = size;
    this.emit('system', `terminal resized to ${size.cols}x${size.rows}`);
  }

  async dispose(reason = 'disposed'): Promise<void> {
    if (this.status === 'exited' || this.status === 'disposing') return;

    this.status = 'disposing';
    this.exitedAt = Date.now();
    this.status = 'exited';

    const event: TerminalExitEvent = {
      sessionId: this.id,
      code: 0,
      reason,
      at: this.exitedAt,
    };

    for (const listener of this.exitListeners) {
      listener(event);
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

  private emit(stream: TerminalOutputChunk['stream'], text: string): void {
    const chunk: TerminalOutputChunk = {
      sessionId: this.id,
      stream,
      text,
      at: Date.now(),
    };

    for (const listener of this.outputListeners) {
      listener(chunk);
    }
  }
}

export class MockSessionBackendAdapter implements SessionBackendAdapter {
  readonly id = 'mock-session-backend';
  readonly version = '1.0.0';

  private booted = false;
  private sequence = 0;
  private readonly sessions = new Map<TerminalSessionId, MockTerminalSessionHandle>();

  async boot(context: SandboxBootContext): Promise<void> {
    void context;
    this.booted = true;
  }

  async createSession(request: TerminalSessionCreateRequest): Promise<TerminalSessionHandle> {
    if (!this.booted) {
      throw new Error('Mock session backend must boot before creating sessions.');
    }

    this.sequence += 1;
    const sessionId = `mock-session-${this.sequence}`;
    const handle = new MockTerminalSessionHandle(sessionId, request.tabId, request);
    this.sessions.set(sessionId, handle);
    handle.onExit(() => this.sessions.delete(sessionId));
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
    await Promise.all(
      Array.from(this.sessions.keys()).map((sessionId) =>
        this.closeSession(sessionId, 'backend disposed'),
      ),
    );
    this.booted = false;
  }

  supports(feature: TerminalBackendFeature): boolean {
    return feature === 'multi-tab' || feature === 'session-restore';
  }
}
