import type { TerminalSessionSnapshot, TerminalTabDescriptor } from './terminal-session.contract';

export type SandboxPluginHook =
  | 'onSandboxBoot'
  | 'onTabCreate'
  | 'onTabClose'
  | 'onBeforeFilesystemReset'
  | 'onAfterFilesystemReset'
  | 'onFileImport'
  | 'onFileExport';

export interface SandboxPluginContext {
  sandboxId: string;
  appId: string;
  runtimeVersion: string;
}

export interface SandboxTabEvent {
  tab: TerminalTabDescriptor;
  session: TerminalSessionSnapshot;
}

export interface SandboxFileImportEvent {
  hostName: string;
  destinationPath: string;
  byteLength: number;
}

export interface SandboxFileExportEvent {
  sourcePath: string;
  suggestedName: string;
  byteLength: number;
}

export interface SandboxFilesystemResetEvent {
  scope: 'session' | 'filesystem';
  reason?: string;
}

export interface SandboxPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly hooks: readonly SandboxPluginHook[];

  onSandboxBoot?(context: SandboxPluginContext): Promise<void> | void;

  onTabCreate?(event: SandboxTabEvent, context: SandboxPluginContext): Promise<void> | void;
  onTabClose?(event: SandboxTabEvent, context: SandboxPluginContext): Promise<void> | void;

  onBeforeFilesystemReset?(
    event: SandboxFilesystemResetEvent,
    context: SandboxPluginContext,
  ): Promise<void> | void;
  onAfterFilesystemReset?(
    event: SandboxFilesystemResetEvent,
    context: SandboxPluginContext,
  ): Promise<void> | void;

  onFileImport?(event: SandboxFileImportEvent, context: SandboxPluginContext): Promise<void> | void;
  onFileExport?(event: SandboxFileExportEvent, context: SandboxPluginContext): Promise<void> | void;
}
