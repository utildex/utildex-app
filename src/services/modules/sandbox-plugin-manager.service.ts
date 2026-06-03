import { Injectable, computed, signal } from '@angular/core';
import { APP_CONFIG } from '../../core/app.config';
import {
  noopSandboxPlugin,
  type SandboxFileExportEvent,
  type SandboxFileImportEvent,
  type SandboxFilesystemResetEvent,
  type SandboxPlugin,
  type SandboxPluginContext,
  type SandboxPluginHook,
  type SandboxPluginInvocationRecord,
  type SandboxPluginRegistrationResult,
  type SandboxTabEvent,
} from '../../core/sandbox';

type PluginInvoker = (plugin: SandboxPlugin, context: SandboxPluginContext) => Promise<void> | void;

const VALID_PLUGIN_HOOKS: ReadonlySet<SandboxPluginHook> = new Set<SandboxPluginHook>([
  'onSandboxBoot',
  'onTabCreate',
  'onTabClose',
  'onBeforeFilesystemReset',
  'onAfterFilesystemReset',
  'onFileImport',
  'onFileExport',
]);

@Injectable({ providedIn: 'root' })
export class SandboxPluginManagerService {
  private readonly pluginsById = new Map<string, SandboxPlugin>();
  private invocationSequence = 0;

  readonly plugins = signal<SandboxPlugin[]>([]);
  readonly invocations = signal<SandboxPluginInvocationRecord[]>([]);

  readonly activePlugins = computed(() =>
    this.plugins().filter((plugin) => plugin.hooks.length > 0),
  );

  constructor() {
    this.register(noopSandboxPlugin);
  }

  register(plugin: SandboxPlugin): SandboxPluginRegistrationResult {
    const validationError = this.validate(plugin);
    if (validationError) {
      return { plugin, registered: false, reason: validationError };
    }

    if (this.pluginsById.has(plugin.id)) {
      return { plugin, registered: false, reason: `Plugin "${plugin.id}" is already registered.` };
    }

    this.pluginsById.set(plugin.id, plugin);
    this.plugins.set(Array.from(this.pluginsById.values()));
    return { plugin, registered: true };
  }

  unregister(pluginId: string): boolean {
    const removed = this.pluginsById.delete(pluginId);
    if (removed) {
      this.plugins.set(Array.from(this.pluginsById.values()));
    }
    return removed;
  }

  async runSandboxBoot(context: SandboxPluginContext): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onSandboxBoot', context, (plugin, hookContext) =>
      plugin.onSandboxBoot?.(hookContext),
    );
  }

  async runTabCreate(
    event: SandboxTabEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onTabCreate', context, (plugin, hookContext) =>
      plugin.onTabCreate?.(event, hookContext),
    );
  }

  async runTabClose(
    event: SandboxTabEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onTabClose', context, (plugin, hookContext) =>
      plugin.onTabClose?.(event, hookContext),
    );
  }

  async runBeforeFilesystemReset(
    event: SandboxFilesystemResetEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onBeforeFilesystemReset', context, (plugin, hookContext) =>
      plugin.onBeforeFilesystemReset?.(event, hookContext),
    );
  }

  async runAfterFilesystemReset(
    event: SandboxFilesystemResetEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onAfterFilesystemReset', context, (plugin, hookContext) =>
      plugin.onAfterFilesystemReset?.(event, hookContext),
    );
  }

  async runFileImport(
    event: SandboxFileImportEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onFileImport', context, (plugin, hookContext) =>
      plugin.onFileImport?.(event, hookContext),
    );
  }

  async runFileExport(
    event: SandboxFileExportEvent,
    context: SandboxPluginContext,
  ): Promise<SandboxPluginInvocationRecord[]> {
    return this.runHook('onFileExport', context, (plugin, hookContext) =>
      plugin.onFileExport?.(event, hookContext),
    );
  }

  clearInvocationHistory(): void {
    this.invocations.set([]);
  }

  createContext(sandboxId: string, runtimeVersion: string): SandboxPluginContext {
    return {
      sandboxId,
      appId: APP_CONFIG.appId,
      runtimeVersion,
    };
  }

  private validate(plugin: SandboxPlugin): string | null {
    if (!plugin.id.trim()) return 'Plugin id is required.';
    if (!plugin.name.trim()) return 'Plugin name is required.';
    if (!plugin.version.trim()) return 'Plugin version is required.';

    for (const hook of plugin.hooks) {
      if (!VALID_PLUGIN_HOOKS.has(hook)) {
        return `Plugin "${plugin.id}" declares unknown hook "${hook}".`;
      }

      if (typeof plugin[hook] !== 'function') {
        return `Plugin "${plugin.id}" declares hook "${hook}" without an implementation.`;
      }
    }

    return null;
  }

  private async runHook(
    hook: SandboxPluginHook,
    context: SandboxPluginContext,
    invoke: PluginInvoker,
  ): Promise<SandboxPluginInvocationRecord[]> {
    const records: SandboxPluginInvocationRecord[] = [];

    for (const plugin of this.plugins()) {
      if (!plugin.hooks.includes(hook)) {
        continue;
      }

      this.invocationSequence += 1;
      const baseRecord = {
        id: `${hook}-${this.invocationSequence}`,
        pluginId: plugin.id,
        hook,
        at: Date.now(),
      };

      try {
        await invoke(plugin, context);
        records.push({ ...baseRecord, status: 'success' });
      } catch (error) {
        records.push({ ...baseRecord, status: 'failed', error: this.formatError(error) });
      }
    }

    if (records.length > 0) {
      this.invocations.update((current) => [...current, ...records]);
    }

    return records;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
