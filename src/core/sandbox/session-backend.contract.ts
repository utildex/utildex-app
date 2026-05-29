import type {
  TerminalSessionHandle,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalTabId,
} from './terminal-session.contract';

export type TerminalBackendFeature =
  | 'multi-tab'
  | 'filesystem-import'
  | 'filesystem-export'
  | 'session-restore'
  | 'plugin-hooks';

export interface SandboxBootContext {
  sandboxId: string;
  runtimeVersion: string;
  offlineOnly: boolean;
}

export interface TerminalSessionCreateRequest {
  tabId: TerminalTabId;
  title?: string;
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface SessionBackendAdapter {
  readonly id: string;
  readonly version: string;

  boot(context: SandboxBootContext): Promise<void>;
  createSession(request: TerminalSessionCreateRequest): Promise<TerminalSessionHandle>;

  getSession(sessionId: TerminalSessionId): TerminalSessionHandle | null;
  listSessions(): readonly TerminalSessionSnapshot[];

  closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void>;
  dispose(): Promise<void>;

  supports(feature: TerminalBackendFeature): boolean;
}
