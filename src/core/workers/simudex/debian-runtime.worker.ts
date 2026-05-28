/// <reference lib="webworker" />

import type {
  DebianRuntimeManifest,
  DebianWorkerRequest,
  DebianWorkerResponse,
} from '../../sandbox/debian-runtime.contract';
import type { SandboxBootContext } from '../../sandbox/session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSessionStatus,
  TerminalSize,
} from '../../sandbox/terminal-session.contract';
import { DebianPreviewShell } from './debian-preview-shell';

interface WorkerSession {
  id: TerminalSessionId;
  tabId: string;
  status: TerminalSessionStatus;
  createdAt: number;
  startedAt: number;
  exitedAt?: number;
  cwd: string;
  title: string;
  size: TerminalSize;
  shell: DebianPreviewShell;
}

let manifest: DebianRuntimeManifest | null = null;
let bootContext: SandboxBootContext | null = null;
const sessions = new Map<TerminalSessionId, WorkerSession>();

addEventListener('message', ({ data }: MessageEvent<DebianWorkerRequest>) => {
  try {
    handleRequest(data);
  } catch (error) {
    sendError(data.id, error instanceof Error ? error.message : 'Debian worker request failed.');
  }
});

function handleRequest(request: DebianWorkerRequest): void {
  if (request.type === 'boot') {
    manifest = request.manifest;
    bootContext = request.context;
    sessions.clear();
    send({
      id: request.id,
      type: 'booted',
      ok: true,
      runtimeVersion: request.manifest.version,
    });
    return;
  }

  if (request.type === 'dispose') {
    for (const session of sessions.values()) {
      emitExit(request.id, session, 'worker disposed');
    }
    sessions.clear();
    manifest = null;
    bootContext = null;
    sendAck(request.id);
    return;
  }

  assertBooted();

  if (request.type === 'create-session') {
    createSession(request);
    return;
  }

  const session = sessions.get(request.sessionId);
  if (!session) {
    throw new Error(`Unknown Debian session: ${request.sessionId}`);
  }

  if (request.type === 'write-input') {
    writeInput(request.id, session, request.input);
    sendAck(request.id);
    return;
  }

  if (request.type === 'resize') {
    session.size = request.size;
    emitOutput(
      request.id,
      session.id,
      'system',
      `terminal resized to ${request.size.cols}x${request.size.rows}`,
    );
    sendAck(request.id);
    return;
  }

  if (request.type === 'close-session') {
    closeSession(request.id, session, request.reason ?? 'session closed');
    sendAck(request.id);
  }
}

function createSession(request: Extract<DebianWorkerRequest, { type: 'create-session' }>): void {
  const runtimeManifest = assertManifest();
  const runtimeBootContext = assertBootContext();
  const cwd = request.cwd ?? runtimeManifest.defaultCwd;
  const session: WorkerSession = {
    id: request.sessionId,
    tabId: request.tabId,
    status: 'ready',
    createdAt: Date.now(),
    startedAt: Date.now(),
    cwd,
    title: request.title ?? 'Debian Shell',
    size: request.size,
    shell: new DebianPreviewShell(runtimeManifest, runtimeBootContext, cwd),
  };

  sessions.set(session.id, session);
  const output = session.shell
    .createWelcomeOutput()
    .map((chunk) => createOutput(session.id, chunk.stream, chunk.text));
  send({
    id: request.id,
    type: 'session-created',
    ok: true,
    session: snapshot(session),
    output,
  });
}

function writeInput(requestId: string, session: WorkerSession, input: string): void {
  if (session.status !== 'ready') {
    emitOutput(requestId, session.id, 'stderr', 'Session is not ready.');
    return;
  }

  const command = input.trim();
  if (!command) return;

  emitOutput(requestId, session.id, 'stdout', `student@simudex-debian:${session.cwd}$ ${command}`);
  const result = session.shell.run(command);
  session.cwd = result.cwd;
  for (const chunk of result.output) {
    emitOutput(requestId, session.id, chunk.stream, chunk.text);
  }
  if (result.exit) {
    closeSession(requestId, session, 'exit command');
  }
}

function closeSession(requestId: string, session: WorkerSession, reason: string): void {
  if (session.status === 'exited') return;
  session.status = 'exited';
  session.exitedAt = Date.now();
  emitExit(requestId, session, reason);
  sessions.delete(session.id);
}

function snapshot(session: WorkerSession): TerminalSessionSnapshot {
  return {
    id: session.id,
    tabId: session.tabId,
    status: session.status,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    exitedAt: session.exitedAt,
    cwd: session.cwd,
    title: session.title,
    size: session.size,
  };
}

function emitOutput(
  requestId: string,
  sessionId: TerminalSessionId,
  stream: TerminalOutputChunk['stream'],
  text: string,
): void {
  send({ id: requestId, type: 'output', ok: true, chunk: createOutput(sessionId, stream, text) });
}

function createOutput(
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

function emitExit(requestId: string, session: WorkerSession, reason: string): void {
  const event: TerminalExitEvent = {
    sessionId: session.id,
    code: 0,
    reason,
    at: session.exitedAt ?? Date.now(),
  };
  send({ id: requestId, type: 'session-exit', ok: true, event });
}

function assertBooted(): void {
  if (!manifest || !bootContext) {
    throw new Error('Debian worker must boot before handling sessions.');
  }
}

function assertManifest(): DebianRuntimeManifest {
  if (!manifest) {
    throw new Error('Debian runtime manifest is not loaded.');
  }
  return manifest;
}

function assertBootContext(): SandboxBootContext {
  if (!bootContext) {
    throw new Error('Debian boot context is not loaded.');
  }
  return bootContext;
}

function sendAck(id: string): void {
  send({ id, type: 'ack', ok: true });
}

function sendError(id: string, error: string): void {
  send({
    id,
    type: 'error',
    ok: false,
    error,
  });
}

function send(response: DebianWorkerResponse): void {
  postMessage(response);
}
