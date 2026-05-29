import type {
  TerminalSessionSnapshot,
  TerminalTabDescriptor,
  TerminalTabId,
} from './terminal-session.contract';

export interface TerminalTabCreateOptions {
  title?: string;
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface TerminalPlatformOutputLine {
  id: string;
  sessionId: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
  at: number;
}

export interface TerminalPlatformSnapshot {
  tabs: readonly TerminalTabDescriptor[];
  activeTabId: TerminalTabId | null;
  sessions: readonly TerminalSessionSnapshot[];
}
