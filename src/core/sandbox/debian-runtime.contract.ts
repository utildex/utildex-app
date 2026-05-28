import { getSimudexDebianResource, getWorkerResource } from '../runtime-resources';
import type { SandboxBootContext } from './session-backend.contract';
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionId,
  TerminalSessionSnapshot,
  TerminalSize,
  TerminalTabId,
} from './terminal-session.contract';

export type DebianRuntimeAssetKind = 'worker' | 'bios' | 'wasm' | 'kernel' | 'initrd' | 'rootfs';
export type DebianRuntimeArchitecture = 'x86_64';

export interface DebianRuntimeAsset {
  id: string;
  kind: DebianRuntimeAssetKind;
  url: string;
  required: boolean;
  bytes?: number;
  integrity?: string;
}

export interface DebianRuntimeManifest {
  id: string;
  name: string;
  distro: 'debian';
  architecture: DebianRuntimeArchitecture;
  version: string;
  protocolVersion: string;
  offlineOnly: true;
  defaultShell: string;
  defaultCwd: string;
  rootfsRevision?: string;
  fallbackCloudRootfsUrl?: string;
  assets: readonly DebianRuntimeAsset[];
}

export type DebianWorkerRequest =
  | {
      id: string;
      type: 'boot';
      context: SandboxBootContext;
      manifest: DebianRuntimeManifest;
    }
  | {
      id: string;
      type: 'create-session';
      sessionId: TerminalSessionId;
      tabId: TerminalTabId;
      title?: string;
      cwd?: string;
      size: TerminalSize;
    }
  | {
      id: string;
      type: 'write-input';
      sessionId: TerminalSessionId;
      input: string;
    }
  | {
      id: string;
      type: 'resize';
      sessionId: TerminalSessionId;
      size: TerminalSize;
    }
  | {
      id: string;
      type: 'close-session';
      sessionId: TerminalSessionId;
      reason?: string;
    }
  | {
      id: string;
      type: 'dispose';
    };

export type DebianWorkerResponse =
  | {
      id: string;
      type: 'booted';
      ok: true;
      runtimeVersion: string;
    }
  | {
      id: string;
      type: 'session-created';
      ok: true;
      session: TerminalSessionSnapshot;
      output?: TerminalOutputChunk[];
    }
  | {
      id: string;
      type: 'output';
      ok: true;
      chunk: TerminalOutputChunk;
    }
  | {
      id: string;
      type: 'session-exit';
      ok: true;
      event: TerminalExitEvent;
    }
  | {
      id: string;
      type: 'ack';
      ok: true;
    }
  | {
      id: string;
      type: 'error';
      ok: false;
      error: string;
    };

export const MINIMAL_DEBIAN_RUNTIME_MANIFEST: DebianRuntimeManifest = {
  id: 'minimal-debian-terminal',
  name: 'Minimal Debian Terminal',
  distro: 'debian',
  architecture: 'x86_64',
  version: '0.1.0',
  protocolVersion: '0.1.0',
  offlineOnly: true,
  defaultShell: '/bin/bash',
  defaultCwd: '/home/student',
  fallbackCloudRootfsUrl: 'wss://disks.webvm.io/debian_large_20230522_5044875331.ext2',
  assets: [
    {
      id: 'debian-worker',
      kind: 'worker',
      url: getWorkerResource('simudexDebian'),
      required: true,
    },
    {
      id: 'debian-bios',
      kind: 'bios',
      url: getSimudexDebianResource('bios'),
      required: true,
    },
    {
      id: 'debian-wasm',
      kind: 'wasm',
      url: getSimudexDebianResource('wasm'),
      required: true,
    },
    {
      id: 'debian-kernel',
      kind: 'kernel',
      url: getSimudexDebianResource('kernel'),
      required: true,
    },
    {
      id: 'debian-initrd',
      kind: 'initrd',
      url: getSimudexDebianResource('initrd'),
      required: true,
    },
    {
      id: 'debian-rootfs',
      kind: 'rootfs',
      url: getSimudexDebianResource('rootfs'),
      required: true,
    },
  ],
};
