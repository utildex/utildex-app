import type { DebianRuntimeManifest } from './debian-runtime.contract';
import type { SandboxBootContext, TerminalSessionCreateRequest } from './session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSize,
} from './terminal-session.contract';
import type { DebianRuntimeClient, DebianRuntimeSessionCreateResult } from './debian-worker-client';

type OutputListener = (chunk: TerminalOutputChunk) => void;
type ExitListener = (event: TerminalExitEvent) => void;

interface CheerpXSessionState {
  snapshot: TerminalSessionSnapshot;
  queue: Promise<void>;
}

interface CheerpXModule {
  Linux: {
    create(optionals?: {
      mounts?: Array<{ type: 'ext2' | 'dir' | 'devs' | 'proc'; path: string; dev?: unknown }>;
      networkInterface?: unknown;
    }): Promise<CheerpXLinuxInstance>;
  };
  HttpBytesDevice: {
    create(url: string): Promise<unknown>;
  };
  CloudDevice: {
    create(url: string): Promise<unknown>;
  };
  IDBDevice: {
    create(devName: string): Promise<CheerpXIdbDeviceInstance>;
  };
  OverlayDevice: {
    create(src: unknown, idb: unknown): Promise<unknown>;
  };
}

interface CheerpXLinuxInstance {
  run(
    fileName: string,
    args: string[],
    optionals?: {
      env?: string[];
      cwd?: string;
      uid?: number;
      gid?: number;
    },
  ): Promise<{ status: number }>;
  setCustomConsole(
    writeFunc: (buffer: Uint8Array, vt: number) => void,
    columns: number,
    rows: number,
  ): (keyCode: number) => void;
  delete(): void;
}

interface CheerpXIdbDeviceInstance {
  reset(): Promise<void>;
}

const OVERLAY_SCHEMA_VERSION = 'v2';

export class CheerpXDebianRuntimeClient implements DebianRuntimeClient {
  private readonly decoder = new TextDecoder();
  private readonly outputListeners = new Set<OutputListener>();
  private readonly exitListeners = new Set<ExitListener>();

  private booted = false;
  private linux: CheerpXLinuxInstance | null = null;
  private idbDevice: CheerpXIdbDeviceInstance | null = null;
  private manifest: DebianRuntimeManifest | null = null;
  private bootContext: SandboxBootContext | null = null;
  private activeSessionId: TerminalSessionId | null = null;
  private runtimeQueue: Promise<void> = Promise.resolve();
  private readonly sessions = new Map<TerminalSessionId, CheerpXSessionState>();

  async boot(context: SandboxBootContext, manifest: DebianRuntimeManifest): Promise<string> {
    if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
      throw new Error(
        'CheerpX requires cross-origin isolation. Configure COOP/COEP headers: Cross-Origin-Opener-Policy=same-origin and Cross-Origin-Embedder-Policy=require-corp.',
      );
    }

    await this.dispose();

    const cheerpx = (await import('@leaningtech/cheerpx')) as unknown as CheerpXModule;
    const rootfsRevision = await this.resolveRootfsRevision(manifest);
    const rootDevice = await this.createRootDevice(cheerpx, manifest, rootfsRevision);
    const overlayVersionKey = this.computeOverlayVersionKey(manifest, rootfsRevision);

    this.idbDevice = await cheerpx.IDBDevice.create(
      `simudex-${manifest.id}-overlay-${OVERLAY_SCHEMA_VERSION}-${overlayVersionKey}`,
    );
    const overlayDevice = await cheerpx.OverlayDevice.create(rootDevice, this.idbDevice);

    this.linux = await cheerpx.Linux.create({
      mounts: [
        { type: 'ext2', path: '/', dev: overlayDevice },
        { type: 'devs', path: '/dev', dev: overlayDevice },
        { type: 'proc', path: '/proc', dev: overlayDevice },
      ],
    });

    this.linux.setCustomConsole((buffer) => this.handleConsoleBuffer(buffer), 80, 24);

    this.manifest = manifest;
    this.bootContext = context;
    this.booted = true;
    return manifest.version;
  }

  async createSession(
    request: TerminalSessionCreateRequest,
    sessionId: TerminalSessionId,
    size: TerminalSize,
  ): Promise<DebianRuntimeSessionCreateResult> {
    this.requireLinux();

    const snapshot: TerminalSessionSnapshot = {
      id: sessionId,
      tabId: request.tabId,
      status: 'ready',
      createdAt: Date.now(),
      startedAt: Date.now(),
      cwd: request.cwd ?? this.requireManifest().defaultCwd,
      title: request.title ?? 'Debian Shell',
      size,
    };

    this.sessions.set(sessionId, {
      snapshot,
      queue: Promise.resolve(),
    });

    const output: TerminalOutputChunk[] = [
      this.output(
        sessionId,
        'system',
        `${this.requireManifest().name} session booted with CheerpX/WebVM.`,
      ),
      this.output(
        sessionId,
        'system',
        `Runtime ${this.requireManifest().version}, protocol ${this.requireManifest().protocolVersion}.`,
      ),
      this.output(
        sessionId,
        'system',
        `Shell cwd: ${snapshot.cwd}. Commands are executed in a real Debian userspace.`,
      ),
    ];

    return { session: snapshot, output };
  }

  async writeInput(sessionId: TerminalSessionId, input: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const command = input.trim();
    if (!command) return;

    session.queue = session.queue
      .catch(() => {
        return;
      })
      .then(async () => {
        await this.enqueueRuntime(async () => {
          const cwd = session.snapshot.cwd ?? this.requireManifest().defaultCwd;
          this.emit(this.output(sessionId, 'stdout', `student@simudex-debian:${cwd}$ ${command}`));

          if (command === 'clear') {
            this.emit(this.output(sessionId, 'system', '[clear requested]'));
            this.emitPrompt(sessionId);
            return;
          }

          if (command === 'exit') {
            await this.closeSession(sessionId, 'exit command');
            return;
          }

          if (await this.tryHandleCd(sessionId, command)) {
            this.emitPrompt(sessionId);
            return;
          }

          await this.runBashCommand(sessionId, command);
          this.emitPrompt(sessionId);
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.emit(this.output(sessionId, 'stderr', message));
        if (this.sessions.has(sessionId)) {
          this.emitPrompt(sessionId);
        }
      });

    await session.queue;
  }

  async resize(sessionId: TerminalSessionId, size: TerminalSize): Promise<void> {
    const session = this.requireSession(sessionId);
    session.snapshot = { ...session.snapshot, size };
    this.emit(this.output(sessionId, 'system', `terminal resized to ${size.cols}x${size.rows}`));
  }

  async closeSession(sessionId: TerminalSessionId, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    this.emitExit({
      sessionId,
      code: 0,
      reason,
      at: Date.now(),
    });
  }

  async dispose(): Promise<void> {
    const now = Date.now();
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      this.emitExit({
        sessionId,
        code: 0,
        reason: 'runtime disposed',
        at: now,
      });
    }
    this.sessions.clear();

    if (this.linux) {
      this.linux.delete();
      this.linux = null;
    }

    this.activeSessionId = null;
    this.booted = false;
    this.manifest = null;
    this.bootContext = null;
    this.runtimeQueue = Promise.resolve();
  }

  onOutput(listener: OutputListener): () => void {
    this.outputListeners.add(listener);
    return () => this.outputListeners.delete(listener);
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  private async tryHandleCd(sessionId: TerminalSessionId, command: string): Promise<boolean> {
    if (command !== 'cd' && !command.startsWith('cd ')) {
      return false;
    }

    const session = this.requireSession(sessionId);
    const arg = command === 'cd' ? '' : command.slice(3).trim();
    const target = this.resolvePath(
      arg || this.requireManifest().defaultCwd,
      session.snapshot.cwd ?? '/',
    );

    this.activeSessionId = sessionId;
    try {
      const result = await this.requireLinux().run('/usr/bin/test', ['-d', target], {
        cwd: '/',
        uid: 1000,
        gid: 1000,
        env: this.env(session.snapshot.cwd ?? '/'),
      });

      if (result.status === 0) {
        session.snapshot = { ...session.snapshot, cwd: target };
        this.emit(this.output(sessionId, 'system', `cwd: ${target}`));
      } else {
        this.emit(
          this.output(sessionId, 'stderr', `cd: ${arg || target}: No such file or directory`),
        );
      }
    } finally {
      this.activeSessionId = null;
    }

    return true;
  }

  private async runBashCommand(sessionId: TerminalSessionId, command: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const cwd = session.snapshot.cwd ?? this.requireManifest().defaultCwd;

    this.activeSessionId = sessionId;
    try {
      await this.requireLinux().run('/bin/bash', ['-lc', command], {
        cwd,
        uid: 1000,
        gid: 1000,
        env: this.env(cwd),
      });
    } finally {
      this.activeSessionId = null;
    }
  }

  private env(cwd: string): string[] {
    return [
      `HOME=${this.requireManifest().defaultCwd}`,
      'USER=student',
      'LOGNAME=student',
      `SHELL=${this.requireManifest().defaultShell}`,
      'LANG=en_US.UTF-8',
      'LC_ALL=C',
      'EDITOR=vim',
      'TERM=xterm-256color',
      `PWD=${cwd}`,
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    ];
  }

  private enqueueRuntime(task: () => Promise<void>): Promise<void> {
    const next = this.runtimeQueue.catch(() => undefined).then(task);
    this.runtimeQueue = next.catch(() => undefined);
    return next;
  }

  private emitPrompt(sessionId: TerminalSessionId): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const cwd = session.snapshot.cwd ?? this.requireManifest().defaultCwd;
    this.emit(this.output(sessionId, 'stdout', `student@simudex-debian:${cwd}$`));
  }

  private handleConsoleBuffer(buffer: Uint8Array): void {
    if (!this.activeSessionId) return;
    const text = this.decoder.decode(buffer);
    if (!text) return;
    this.emit(this.output(this.activeSessionId, 'stdout', text));
  }

  private output(
    sessionId: TerminalSessionId,
    stream: TerminalOutputChunk['stream'],
    text: string,
  ): TerminalOutputChunk {
    return {
      sessionId,
      stream,
      text,
      at: Date.now(),
    };
  }

  private emit(chunk: TerminalOutputChunk): void {
    for (const listener of this.outputListeners) {
      listener(chunk);
    }
  }

  private emitExit(event: TerminalExitEvent): void {
    for (const listener of this.exitListeners) {
      listener(event);
    }
  }

  private resolvePath(target: string, cwd: string): string {
    if (!target) return cwd;
    if (target === '~') return this.requireManifest().defaultCwd;
    if (target.startsWith('~/')) {
      return this.normalizePath(`${this.requireManifest().defaultCwd}/${target.slice(2)}`);
    }
    if (target.startsWith('/')) return this.normalizePath(target);
    return this.normalizePath(`${cwd}/${target}`);
  }

  private normalizePath(path: string): string {
    const parts: string[] = [];
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return `/${parts.join('/')}`;
  }

  private getPrimaryRootfsUrl(manifest: DebianRuntimeManifest): string {
    const root = manifest.assets.find((asset) => asset.kind === 'rootfs');
    if (root?.url) {
      return root.url;
    }

    if (manifest.fallbackCloudRootfsUrl) {
      return manifest.fallbackCloudRootfsUrl;
    }

    throw new Error('Debian runtime rootfs asset is missing from the runtime manifest.');
  }

  private async createRootDevice(
    cheerpx: CheerpXModule,
    manifest: DebianRuntimeManifest,
    rootfsRevision: string,
  ): Promise<unknown> {
    const primaryUrl = this.getPrimaryRootfsUrl(manifest);
    try {
      return await this.createDeviceFromUrl(cheerpx, primaryUrl, rootfsRevision);
    } catch (error) {
      const fallbackUrl = manifest.fallbackCloudRootfsUrl;
      if (!fallbackUrl || fallbackUrl === primaryUrl) {
        throw error;
      }

      return this.createDeviceFromUrl(cheerpx, fallbackUrl, rootfsRevision);
    }
  }

  private createDeviceFromUrl(
    cheerpx: CheerpXModule,
    url: string,
    rootfsRevision: string,
  ): Promise<unknown> {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return cheerpx.CloudDevice.create(url);
    }

    return cheerpx.HttpBytesDevice.create(this.withRootfsRevision(url, rootfsRevision));
  }

  private async resolveRootfsRevision(manifest: DebianRuntimeManifest): Promise<string> {
    const primaryUrl = this.getPrimaryRootfsUrl(manifest);
    const fallback = manifest.rootfsRevision ?? manifest.version;
    if (primaryUrl.startsWith('ws://') || primaryUrl.startsWith('wss://')) {
      return fallback;
    }

    const fromMetadata = await this.readRootfsMetadataRevision(primaryUrl);
    return fromMetadata ?? fallback;
  }

  private async readRootfsMetadataRevision(rootfsUrl: string): Promise<string | null> {
    if (typeof fetch === 'undefined') return null;

    const metadataUrl = this.toRootfsMetadataUrl(rootfsUrl);
    if (!metadataUrl) return null;

    try {
      const response = await fetch(metadataUrl, { cache: 'no-store' });
      if (!response.ok) return null;
      const payload = (await response.json()) as { revision?: unknown };
      return typeof payload.revision === 'string' && payload.revision.trim()
        ? payload.revision.trim()
        : null;
    } catch {
      return null;
    }
  }

  private toRootfsMetadataUrl(rootfsUrl: string): string | null {
    try {
      const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
      const parsed = new URL(rootfsUrl, base);
      const path = parsed.pathname;
      const marker = '/rootfs.ext2';
      if (path.endsWith(marker)) {
        parsed.pathname = `${path.slice(0, -marker.length)}/rootfs.meta.json`;
      } else {
        parsed.pathname = `${path.replace(/\/$/, '')}/rootfs.meta.json`;
      }
      parsed.search = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private withRootfsRevision(url: string, rootfsRevision: string): string {
    try {
      const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
      const parsed = new URL(url, base);
      parsed.searchParams.set('rootfsRev', rootfsRevision);
      return parsed.toString();
    } catch {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}rootfsRev=${encodeURIComponent(rootfsRevision)}`;
    }
  }

  private computeOverlayVersionKey(
    manifest: DebianRuntimeManifest,
    rootfsRevision: string,
  ): string {
    const source = `${manifest.version}:${manifest.protocolVersion}:${rootfsRevision}`;
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  }

  private requireLinux(): CheerpXLinuxInstance {
    if (!this.linux || !this.booted) {
      throw new Error('CheerpX runtime is not booted.');
    }
    return this.linux;
  }

  private requireSession(sessionId: TerminalSessionId): CheerpXSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown CheerpX session: ${sessionId}`);
    }
    return session;
  }

  private requireManifest(): DebianRuntimeManifest {
    if (!this.manifest) {
      throw new Error('Debian runtime manifest is not available.');
    }
    return this.manifest;
  }
}
