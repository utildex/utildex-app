export type TerminalTabId = string;
export type TerminalSessionId = string;

export type TerminalSessionStatus =
  'idle' | 'starting' | 'ready' | 'exited' | 'error' | 'disposing';

export type TerminalOutputStream = 'stdout' | 'stderr' | 'system';

export interface TerminalSize {
  cols: number;
  rows: number;
}

export interface TerminalOutputChunk {
  sessionId: TerminalSessionId;
  stream: TerminalOutputStream;
  text: string;
  at: number;
}

export interface TerminalExitEvent {
  sessionId: TerminalSessionId;
  code: number | null;
  signal?: string;
  reason?: string;
  at: number;
}

export interface TerminalSessionSnapshot {
  id: TerminalSessionId;
  tabId: TerminalTabId;
  status: TerminalSessionStatus;
  createdAt: number;
  startedAt?: number;
  exitedAt?: number;
  cwd?: string;
  title?: string;
  size: TerminalSize;
}

export interface TerminalTabDescriptor {
  id: TerminalTabId;
  title: string;
  createdAt: number;
  sessionId: TerminalSessionId;
  active: boolean;
}

export interface TerminalSessionHandle {
  readonly id: TerminalSessionId;
  readonly tabId: TerminalTabId;

  getStatus(): TerminalSessionStatus;
  snapshot(): TerminalSessionSnapshot;

  writeInput(input: string): Promise<void>;
  resize(size: TerminalSize): Promise<void>;
  dispose(reason?: string): Promise<void>;

  onOutput(listener: (chunk: TerminalOutputChunk) => void): () => void;
  onExit(listener: (event: TerminalExitEvent) => void): () => void;
}
