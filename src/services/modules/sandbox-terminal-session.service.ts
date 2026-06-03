import { Injectable, computed, inject, signal } from '@angular/core';
import { APP_CONFIG } from '../../core/app.config';
import {
  MockSessionBackendAdapter,
  type SessionBackendAdapter,
  type SandboxPluginContext,
  type TerminalPlatformOutputLine,
  type TerminalPlatformSnapshot,
  type TerminalSessionHandle,
  type TerminalSessionId,
  type TerminalSessionSnapshot,
  type TerminalSize,
  type TerminalTabCreateOptions,
  type TerminalTabDescriptor,
  type TerminalTabId,
} from '../../core/sandbox';
import { SandboxPluginManagerService } from './sandbox-plugin-manager.service';

@Injectable({ providedIn: 'root' })
export class SandboxTerminalSessionService {
  private readonly plugins = inject(SandboxPluginManagerService);
  private backend: SessionBackendAdapter = new MockSessionBackendAdapter();
  private bootPromise: Promise<void> | null = null;
  private tabSequence = 0;
  private outputSequence = 0;
  private readonly handles = new Map<TerminalSessionId, TerminalSessionHandle>();
  private readonly cleanupCallbacks = new Map<TerminalSessionId, Array<() => void>>();

  readonly tabs = signal<TerminalTabDescriptor[]>([]);
  readonly activeTabId = signal<TerminalTabId | null>(null);
  readonly sessions = signal<TerminalSessionSnapshot[]>([]);
  readonly output = signal<Record<TerminalSessionId, TerminalPlatformOutputLine[]>>({});

  readonly activeTab = computed(() => {
    const activeId = this.activeTabId();
    return this.tabs().find((tab) => tab.id === activeId) ?? null;
  });

  readonly activeSession = computed(() => {
    const tab = this.activeTab();
    if (!tab) return null;
    return this.sessions().find((session) => session.id === tab.sessionId) ?? null;
  });

  readonly activeOutput = computed(() => {
    const session = this.activeSession();
    return session ? (this.output()[session.id] ?? []) : [];
  });

  snapshot = computed<TerminalPlatformSnapshot>(() => ({
    tabs: this.tabs(),
    activeTabId: this.activeTabId(),
    sessions: this.sessions(),
  }));

  async setBackend(adapter: SessionBackendAdapter): Promise<void> {
    await this.disposeAll();
    this.backend = adapter;
    this.bootPromise = null;
  }

  async createTab(options: TerminalTabCreateOptions = {}): Promise<TerminalTabDescriptor> {
    await this.ensureBooted();

    if (!this.backend.supports('multi-tab') && this.tabs().length > 0) {
      const existing = this.tabs()[0];
      this.setActiveTab(existing.id);
      return existing;
    }

    this.tabSequence += 1;
    const tabId = `terminal-tab-${this.tabSequence}`;
    const title = options.title ?? `Terminal ${this.tabSequence}`;
    const handle = await this.backend.createSession({ ...options, tabId, title });
    const session = handle.snapshot();
    const tab: TerminalTabDescriptor = {
      id: tabId,
      title,
      createdAt: Date.now(),
      sessionId: session.id,
      active: true,
    };

    this.handles.set(session.id, handle);
    this.registerHandle(handle);

    this.tabs.update((tabs) => [...tabs.map((item) => ({ ...item, active: false })), tab]);
    this.sessions.update((sessions) => [...sessions, session]);
    this.activeTabId.set(tab.id);

    await this.plugins.runTabCreate({ tab, session }, this.createPluginContext());

    return tab;
  }

  setActiveTab(tabId: TerminalTabId): boolean {
    if (!this.tabs().some((tab) => tab.id === tabId)) {
      return false;
    }

    this.activeTabId.set(tabId);
    this.tabs.update((tabs) => tabs.map((tab) => ({ ...tab, active: tab.id === tabId })));
    return true;
  }

  async closeTab(tabId: TerminalTabId): Promise<void> {
    const tab = this.tabs().find((item) => item.id === tabId);
    if (!tab) return;
    const session = this.sessions().find((item) => item.id === tab.sessionId);

    await this.backend.closeSession(tab.sessionId, 'tab closed');
    this.cleanupSession(tab.sessionId);
    this.handles.delete(tab.sessionId);
    this.sessions.update((sessions) => sessions.filter((session) => session.id !== tab.sessionId));
    this.tabs.update((tabs) => tabs.filter((item) => item.id !== tabId));

    if (this.activeTabId() === tabId) {
      const next = this.tabs()[0] ?? null;
      this.activeTabId.set(next?.id ?? null);
      if (next) {
        this.setActiveTab(next.id);
      }
    }

    if (session) {
      await this.plugins.runTabClose({ tab, session }, this.createPluginContext());
    }
  }

  async writeToActiveTab(input: string): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    await this.handles.get(session.id)?.writeInput(input);
    this.refreshSession(session.id);
  }

  async resizeActiveTab(size: TerminalSize): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    await this.handles.get(session.id)?.resize(size);
    this.refreshSession(session.id);
  }

  async disposeAll(): Promise<void> {
    await this.backend.dispose();
    for (const sessionId of this.cleanupCallbacks.keys()) {
      this.cleanupSession(sessionId);
    }
    this.handles.clear();
    this.tabs.set([]);
    this.activeTabId.set(null);
    this.sessions.set([]);
    this.output.set({});
  }

  private ensureBooted(): Promise<void> {
    if (!this.bootPromise) {
      this.bootPromise = this.bootBackendAndPlugins();
    }

    return this.bootPromise;
  }

  private async bootBackendAndPlugins(): Promise<void> {
    await this.backend.boot({
      sandboxId: 'shared-terminal-platform',
      runtimeVersion: this.backend.version,
      offlineOnly: APP_CONFIG.appId === 'simudex',
    });
    await this.plugins.runSandboxBoot(this.createPluginContext());
  }

  private createPluginContext(): SandboxPluginContext {
    return this.plugins.createContext('shared-terminal-platform', this.backend.version);
  }

  private registerHandle(handle: TerminalSessionHandle): void {
    const outputCleanup = handle.onOutput((chunk) => {
      this.outputSequence += 1;
      const line: TerminalPlatformOutputLine = {
        id: `${chunk.sessionId}-${this.outputSequence}`,
        sessionId: chunk.sessionId,
        stream: chunk.stream,
        text: chunk.text,
        at: chunk.at,
      };

      this.output.update((current) => ({
        ...current,
        [chunk.sessionId]: [...(current[chunk.sessionId] ?? []), line],
      }));
    });

    const exitCleanup = handle.onExit(() => this.refreshSession(handle.id));
    this.cleanupCallbacks.set(handle.id, [outputCleanup, exitCleanup]);
  }

  private refreshSession(sessionId: TerminalSessionId): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;

    const snapshot = handle.snapshot();
    this.sessions.update((sessions) =>
      sessions.map((session) => (session.id === sessionId ? snapshot : session)),
    );
  }

  private cleanupSession(sessionId: TerminalSessionId): void {
    const cleanup = this.cleanupCallbacks.get(sessionId) ?? [];
    for (const callback of cleanup) {
      callback();
    }
    this.cleanupCallbacks.delete(sessionId);
  }
}
