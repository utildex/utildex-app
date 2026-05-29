import type { SandboxPlugin, SandboxPluginHook } from './sandbox-plugin.contract';

export type SandboxPluginInvocationStatus = 'success' | 'failed' | 'skipped';

export interface SandboxPluginInvocationRecord {
  id: string;
  pluginId: string;
  hook: SandboxPluginHook;
  status: SandboxPluginInvocationStatus;
  at: number;
  error?: string;
}

export interface SandboxPluginRegistrationResult {
  plugin: SandboxPlugin;
  registered: boolean;
  reason?: string;
}
