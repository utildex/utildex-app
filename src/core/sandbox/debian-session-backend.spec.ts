import { describe, expect, it } from 'vitest';
import { DebianSessionBackendAdapter } from './debian-session-backend';
import type { DebianRuntimeClient, DebianRuntimeSessionCreateResult } from './debian-worker-client';
import type { SandboxBootContext, TerminalSessionCreateRequest } from './session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSize,
} from './terminal-session.contract';
import type { DebianRuntimeManifest } from './debian-runtime.contract';

type OutputListener = (chunk: TerminalOutputChunk) => void;
type ExitListener = (event: TerminalExitEvent) => void;

class FakeDebianRuntimeClient implements DebianRuntimeClient {
  bootCalls: SandboxBootContext[] = [];
  createSessionCalls: TerminalSessionCreateRequest[] = [];
  writeCalls: Array<{ sessionId: TerminalSessionId; input: string }> = [];
  resizeCalls: Array<{ sessionId: TerminalSessionId; size: TerminalSize }> = [];
  closeCalls: Array<{ sessionId: TerminalSessionId; reason?: string }> = [];
  disposeCalls = 0;

  private manifest: DebianRuntimeManifest | null = null;
  private bootContext: SandboxBootContext | null = null;
  private readonly sessions = new Map<TerminalSessionId, TerminalSessionSnapshot>();
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  async boot(context: SandboxBootContext, manifest: DebianRuntimeManifest): Promise<string> {
    this.bootCalls.push(context);
    this.bootContext = context;
    this.manifest = manifest;
    return manifest.version;
  }

  async createSession(
    request: TerminalSessionCreateRequest,
    sessionId: TerminalSessionId,
    size: TerminalSize,
  ): Promise<DebianRuntimeSessionCreateResult> {
    this.createSessionCalls.push(request);
    const manifest = this.requireManifest();
    const session: TerminalSessionSnapshot = {
      id: sessionId,
      tabId: request.tabId,
      status: 'ready',
      createdAt: Date.now(),
      startedAt: Date.now(),
      cwd: request.cwd ?? manifest.defaultCwd,
      title: request.title ?? 'Debian Shell',
      size,
    };

    this.sessions.set(sessionId, session);
    return {
      session,
      output: [
        {
          sessionId,
          stream: 'system',
          text: `${manifest.name} worker session ready in ${session.cwd}.`,
          at: Date.now(),
        },
      ],
    };
  }

  async writeInput(sessionId: TerminalSessionId, input: string): Promise<void> {
    this.writeCalls.push({ sessionId, input });
    const session = this.requireSession(sessionId);
    const command = input.trim();
    this.emitOutput(sessionId, 'stdout', `student@simudex-debian:${session.cwd}$ ${command}`);

    if (command === 'runtime') {
      const manifest = this.requireManifest();
      this.emitOutput(sessionId, 'stdout', `${manifest.name} (${manifest.architecture})`);
      this.emitOutput(
        sessionId,
        'stdout',
        `boot sandbox: ${this.bootContext?.sandboxId ?? 'unknown'}`,
      );
      return;
    }

    if (command === 'assets') {
      for (const asset of this.requireManifest().assets) {
        const requirement = asset.required ? 'required' : 'optional';
        this.emitOutput(
          sessionId,
          'stdout',
          `${asset.kind}:${asset.id} -> ${asset.url} (${requirement})`,
        );
      }
      return;
    }

    if (command === 'exit') {
      await this.closeSession(sessionId, 'exit command');
      return;
    }

    this.emitOutput(sessionId, 'stderr', 'Debian VM execution is not connected yet.');
  }

  async resize(sessionId: TerminalSessionId, size: TerminalSize): Promise<void> {
    this.resizeCalls.push({ sessionId, size });
    const session = this.requireSession(sessionId);
    this.sessions.set(sessionId, { ...session, size });
    this.emitOutput(sessionId, 'system', `terminal resized to ${size.cols}x${size.rows}`);
  }

  async closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void> {
    this.closeCalls.push({ sessionId, reason });
    const session = this.requireSession(sessionId);
    this.sessions.delete(sessionId);
    const event: TerminalExitEvent = {
      sessionId,
      code: 0,
      reason,
      at: Date.now(),
    };
    for (const listener of this.exitListeners) {
      listener(event);
    }
    this.sessions.set(sessionId, { ...session, status: 'exited', exitedAt: event.at });
  }

  async dispose(): Promise<void> {
    this.disposeCalls += 1;
    this.sessions.clear();
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  private requireManifest(): DebianRuntimeManifest {
    if (!this.manifest) throw new Error('Fake Debian runtime client was not booted.');
    return this.manifest;
  }

  private requireSession(sessionId: TerminalSessionId): TerminalSessionSnapshot {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown fake Debian session: ${sessionId}`);
    return session;
  }

  private emitOutput(
    sessionId: TerminalSessionId,
    stream: TerminalOutputChunk['stream'],
    text: string,
  ): void {
    const chunk: TerminalOutputChunk = {
      sessionId,
      stream,
      text,
      at: Date.now(),
    };
    for (const listener of this.outputListeners) {
      listener(chunk);
    }
  }
}

describe('DebianSessionBackendAdapter', () => {
  it('requires offline-only boot before session creation', async () => {
    const backend = new DebianSessionBackendAdapter(undefined, new FakeDebianRuntimeClient());

    await expect(backend.createSession({ tabId: 'tab-1' })).rejects.toThrow('must boot');
    await expect(
      backend.boot({
        sandboxId: 'minimal-debian-terminal',
        runtimeVersion: backend.version,
        offlineOnly: false,
      }),
    ).rejects.toThrow('offline-only');
  });

  it('creates terminal sessions behind the shared backend contract', async () => {
    const client = new FakeDebianRuntimeClient();
    const backend = new DebianSessionBackendAdapter(undefined, client);
    await backend.boot({
      sandboxId: 'minimal-debian-terminal',
      runtimeVersion: backend.version,
      offlineOnly: true,
    });

    const first = await backend.createSession({ tabId: 'tab-1', title: 'First' });
    const second = await backend.createSession({ tabId: 'tab-2', title: 'Second' });

    expect(first.id).not.toBe(second.id);
    expect(backend.listSessions()).toHaveLength(2);
    expect(client.bootCalls).toHaveLength(1);
    expect(client.createSessionCalls).toHaveLength(2);
    expect(backend.supports('multi-tab')).toBe(true);
    expect(backend.supports('session-restore')).toBe(false);
  });

  it('exposes runtime manifest output without executing remote commands', async () => {
    const client = new FakeDebianRuntimeClient();
    const backend = new DebianSessionBackendAdapter(undefined, client);
    await backend.boot({
      sandboxId: 'minimal-debian-terminal',
      runtimeVersion: backend.version,
      offlineOnly: true,
    });
    const handle = await backend.createSession({ tabId: 'tab-1' });
    const output: string[] = [];
    handle.onOutput((chunk) => output.push(chunk.text));

    await Promise.resolve();
    await handle.writeInput('runtime');
    await handle.writeInput('assets');
    await handle.writeInput('uname -a');

    expect(output).toContain('Minimal Debian Terminal (x86_64)');
    expect(output.some((line) => line.includes('rootfs:debian-rootfs'))).toBe(true);
    expect(output).toContain('Debian VM execution is not connected yet.');
    expect(client.writeCalls.map((call) => call.input)).toEqual(['runtime', 'assets', 'uname -a']);
  });

  it('replays initial worker output after the session handle is registered', async () => {
    const client = new FakeDebianRuntimeClient();
    const backend = new DebianSessionBackendAdapter(undefined, client);
    await backend.boot({
      sandboxId: 'minimal-debian-terminal',
      runtimeVersion: backend.version,
      offlineOnly: true,
    });

    const handle = await backend.createSession({ tabId: 'tab-1' });
    const output: string[] = [];
    handle.onOutput((chunk) => output.push(chunk.text));

    expect(output).toContain('Minimal Debian Terminal worker session ready in /home/student.');
  });

  it('delegates resize and close operations to the runtime client', async () => {
    const client = new FakeDebianRuntimeClient();
    const backend = new DebianSessionBackendAdapter(undefined, client);
    await backend.boot({
      sandboxId: 'minimal-debian-terminal',
      runtimeVersion: backend.version,
      offlineOnly: true,
    });
    const handle = await backend.createSession({ tabId: 'tab-1' });

    await handle.resize({ cols: 120, rows: 32 });
    await backend.closeSession(handle.id, 'test closed');

    expect(client.resizeCalls).toEqual([{ sessionId: handle.id, size: { cols: 120, rows: 32 } }]);
    expect(client.closeCalls).toEqual([{ sessionId: handle.id, reason: 'test closed' }]);
    expect(backend.listSessions()).toHaveLength(0);
  });
});
