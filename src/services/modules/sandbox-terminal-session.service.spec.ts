import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type {
  SandboxBootContext,
  SessionBackendAdapter,
  TerminalBackendFeature,
  TerminalSessionCreateRequest,
} from '../../core/sandbox';
import { SandboxPluginManagerService } from './sandbox-plugin-manager.service';
import { SandboxTerminalSessionService } from './sandbox-terminal-session.service';

class SingleTabOnlyBackend implements SessionBackendAdapter {
  readonly id = 'single-tab-only-backend';
  readonly version = '1.0.0';

  private sequence = 0;
  private readonly sessions = new Map<string, import('../../core/sandbox').TerminalSessionHandle>();

  async boot(context: SandboxBootContext): Promise<void> {
    void context;
  }

  async createSession(
    request: TerminalSessionCreateRequest,
  ): Promise<import('../../core/sandbox').TerminalSessionHandle> {
    this.sequence += 1;
    const sessionId = `single-tab-session-${this.sequence}`;
    const snapshot: import('../../core/sandbox').TerminalSessionSnapshot = {
      id: sessionId,
      tabId: request.tabId,
      status: 'ready',
      createdAt: Date.now(),
      startedAt: Date.now(),
      cwd: request.cwd ?? '/home/student',
      title: request.title ?? 'Shell',
      size: { cols: 80, rows: 24 },
    };

    const outputListeners = new Set<
      (chunk: import('../../core/sandbox').TerminalOutputChunk) => void
    >();
    const exitListeners = new Set<
      (event: import('../../core/sandbox').TerminalExitEvent) => void
    >();

    const handle: import('../../core/sandbox').TerminalSessionHandle = {
      id: sessionId,
      tabId: request.tabId,
      getStatus: () => snapshot.status,
      snapshot: () => snapshot,
      writeInput: async (input: string) => {
        void input;
      },
      resize: async () => {
        return;
      },
      dispose: async () => {
        snapshot.status = 'exited';
        const event: import('../../core/sandbox').TerminalExitEvent = {
          sessionId,
          code: 0,
          at: Date.now(),
        };
        for (const listener of exitListeners) {
          listener(event);
        }
      },
      onOutput: (listener) => {
        outputListeners.add(listener);
        return () => outputListeners.delete(listener);
      },
      onExit: (listener) => {
        exitListeners.add(listener);
        return () => exitListeners.delete(listener);
      },
    };

    this.sessions.set(sessionId, handle);
    return handle;
  }

  getSession(sessionId: string): import('../../core/sandbox').TerminalSessionHandle | null {
    return this.sessions.get(sessionId) ?? null;
  }

  listSessions(): readonly import('../../core/sandbox').TerminalSessionSnapshot[] {
    return Array.from(this.sessions.values()).map((session) => session.snapshot());
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sessions.get(sessionId)?.dispose('closed');
    this.sessions.delete(sessionId);
  }

  async dispose(): Promise<void> {
    this.sessions.clear();
  }

  supports(feature: TerminalBackendFeature): boolean {
    return feature === 'plugin-hooks';
  }
}

describe('SandboxTerminalSessionService', () => {
  it('emits plugin hooks for boot, tab creation, and tab closure', async () => {
    TestBed.configureTestingModule({});
    const pluginManager = TestBed.inject(SandboxPluginManagerService);
    const onSandboxBoot = vi.fn();
    const onTabCreate = vi.fn();
    const onTabClose = vi.fn();

    pluginManager.register({
      id: 'terminal-lifecycle-plugin',
      name: 'Terminal Lifecycle Plugin',
      version: '1.0.0',
      hooks: ['onSandboxBoot', 'onTabCreate', 'onTabClose'],
      onSandboxBoot,
      onTabCreate,
      onTabClose,
    });

    const service = TestBed.inject(SandboxTerminalSessionService);
    const tab = await service.createTab({ title: 'Lifecycle Test' });
    await service.closeTab(tab.id);

    expect(onSandboxBoot).toHaveBeenCalledTimes(1);
    expect(onTabCreate).toHaveBeenCalledTimes(1);
    expect(onTabClose).toHaveBeenCalledTimes(1);
    expect(pluginManager.invocations().map((record) => record.hook)).toEqual([
      'onSandboxBoot',
      'onTabCreate',
      'onTabClose',
    ]);
  });

  it('reuses the existing tab when backend does not support multi-tab', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SandboxTerminalSessionService);
    await service.setBackend(new SingleTabOnlyBackend());

    const first = await service.createTab({ title: 'Only One' });
    const second = await service.createTab({ title: 'Second Request' });

    expect(second.id).toBe(first.id);
    expect(service.tabs()).toHaveLength(1);
  });
});
