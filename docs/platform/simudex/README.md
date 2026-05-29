# Simudex Platform

Simudex is the simulations app in the shared multi-app repository. It has an independent Angular bundle boundary and runtime identity. The current implementation includes shared sandbox contracts, the shared terminal platform, the plugin host, the first Debian runtime scaffold, the Debian worker bridge, a local Debian preview shell, and a CheerpX/WebVM runtime client.

## Current Wiring

- App id: `simudex`
- App name: `Simudex`
- Route segment: `/simulations`
- Build output: `dist/simudex`
- Dev server port: `3002`
- Content root: `src/simudex-simulations/`
- SEO output: `src/seo/simudex/`

## Files

- Runtime config: `app.config.simudex.ts`
- Entry point: `index.simudex.tsx`
- HTML shell: `index.simudex.html`
- App shell: `src/app.component.simudex.ts` and `src/app.component.simudex.html`
- Routes: `src/app.routes.simudex.ts`
- Core registry: `src/core/core-registry.simudex.ts`
- Component registry: `src/core/tool-registry.simudex.ts`
- Space registry: `src/data/tool-space-registry.simudex.ts`
- Offline preload routes: `src/services/offline-route-loaders.simudex.ts`
- Manifest: `manifest.simudex.webmanifest`
- Service worker config: `ngsw-config.simudex.json`
- Sandbox contracts index: `src/core/sandbox/index.ts`
- Terminal session contract: `src/core/sandbox/terminal-session.contract.ts`
- Session backend adapter contract: `src/core/sandbox/session-backend.contract.ts`
- Sandbox plugin contract: `src/core/sandbox/sandbox-plugin.contract.ts`
- Sandbox plugin host contract: `src/core/sandbox/sandbox-plugin-host.contract.ts`
- Internal no-op plugin: `src/core/sandbox/noop-sandbox-plugin.ts`
- Terminal platform contract: `src/core/sandbox/terminal-platform.contract.ts`
- Mock terminal backend: `src/core/sandbox/mock-session-backend.ts`
- Shared terminal session manager: `src/services/sandbox-terminal-session.service.ts`
- Sandbox plugin manager: `src/services/sandbox-plugin-manager.service.ts`
- Shared terminal component: `src/components/terminal-platform/terminal-platform.component.ts`
- Debian runtime contract: `src/core/sandbox/debian-runtime.contract.ts`
- Debian worker client: `src/core/sandbox/debian-worker-client.ts`
- CheerpX runtime client: `src/core/sandbox/cheerpx-runtime-client.ts`
- Debian backend adapter scaffold: `src/core/sandbox/debian-session-backend.ts`
- Debian preview shell: `src/core/workers/simudex/debian-preview-shell.ts`
- Debian worker protocol stub: `src/core/workers/simudex/debian-runtime.worker.ts`
- First simulation module: `src/simudex-simulations/minimal-debian-terminal/`

## Phase 1 Foundations (Implemented)

The codebase now includes shared contracts that must be used by all future sandbox runtimes.

- Terminal abstractions: tab id, session id, status model, output/exit events, session snapshots, and session handles.
- Backend adapter abstraction: a runtime-neutral interface for booting sandboxes and creating/closing terminal sessions.
- Plugin abstraction: explicit lifecycle hooks for sandbox boot, tab lifecycle, filesystem reset, and file import/export.
- Shared export surface: `src/core/sandbox/index.ts` is the only import point that feature modules should use.

These are architecture-only contracts. They intentionally do not include runtime behavior yet.

## Phase 2 Shared Terminal Platform (Implemented)

The shared terminal platform now exists independently from Debian or any other VM runtime.

- `TerminalPlatformComponent` renders the reusable terminal surface: tab bar, output pane, command input, and status label.
- `SandboxTerminalSessionService` owns multi-tab state, active tab selection, session snapshots, output buffers, and backend replacement.
- `MockSessionBackendAdapter` implements `SessionBackendAdapter` so the terminal platform can be developed and tested before a real VM exists.
- Each tab maps to exactly one terminal session. Future Debian integration must preserve this mapping by implementing `SessionBackendAdapter` instead of adding Debian-specific tab logic to the component.
- The service exposes `setBackend(adapter)` so a future Debian adapter can replace the mock backend while keeping the component unchanged.

The mock backend supports simple placeholder commands (`help`, `pwd`, `cd <path>`, `clear`, `exit`) and exists only to validate shared terminal behavior.

## Phase 3 Plugin Host (Implemented)

The plugin host exists before the Debian runtime so extension points are part of the architecture, not retrofitted later.

- `SandboxPluginManagerService` registers plugins, validates their declared hooks, runs hooks, and records hook invocation results.
- `noopSandboxPlugin` is registered by default as an internal placeholder. It has no hooks and proves that the plugin host can load internal plugins without affecting runtime behavior.
- Plugin failures are isolated: if one plugin hook throws, the manager records a failed invocation and continues running the remaining plugins.
- The shared terminal session manager now emits plugin hooks for sandbox boot, tab creation, and tab closure.
- Filesystem reset and file import/export hooks are available in the contract and manager, but they are not emitted until those platform flows exist.

The current hook surface is:

- `onSandboxBoot`
- `onTabCreate`
- `onTabClose`
- `onBeforeFilesystemReset`
- `onAfterFilesystemReset`
- `onFileImport`
- `onFileExport`

Future features such as Debian setup import/export should be implemented as plugins that register one or more of these hooks. Add new hooks only when the behavior is platform-level and cannot be represented by the existing lifecycle.

## Phase 4 Debian Runtime Scaffold (Implemented)

The first Simudex simulation is now wired as `minimal-debian-terminal`.

- `src/core/sandbox/debian-runtime.contract.ts` defines the Debian runtime manifest, local asset model, and worker protocol message types.
- `src/core/sandbox/debian-session-backend.ts` implements `SessionBackendAdapter` for the Debian runtime boundary.
- `src/core/workers/simudex/debian-runtime.worker.ts` reserves the browser worker entry point and acknowledges the protocol without implementing VM execution yet.
- `src/core/runtime-resources.ts` centralizes the future Debian worker, BIOS, WASM, kernel, initrd, and rootfs asset paths.
- `src/simudex-simulations/minimal-debian-terminal/` provides the first routeable Simudex simulation and renders the shared `TerminalPlatformComponent`.
- Simudex registries now expose `minimal-debian-terminal` through `/simulations/minimal-debian-terminal`.

The Phase 4 adapter is intentionally not a full Debian VM yet. It validates the offline-only runtime boundary, exposes runtime and asset metadata through the terminal, supports multi-tab sessions through the shared contract, and keeps VM execution behind the worker protocol for the next phase.

## Phase 5 Debian Worker Bridge (Implemented)

The Debian backend now communicates through an explicit runtime client instead of emulating shell behavior directly in the main-thread adapter.

- `BrowserDebianRuntimeClient` owns the Worker instance, request ids, pending request resolution, and output/exit event fan-out.
- `DebianSessionBackendAdapter` delegates boot, session creation, input, resize, close, and disposal through the runtime client.
- `src/core/workers/simudex/debian-runtime.worker.ts` now handles the scaffolded session protocol: boot, create session, write input, resize, close session, and dispose.
- The worker still uses placeholder shell behavior, but that behavior is now behind the same protocol the real VM engine will use.
- Tests inject a fake `DebianRuntimeClient`, which keeps backend tests deterministic and proves the adapter boundary without depending on browser Worker execution.

This phase does not add a Debian image or emulator dependency. The next runtime step should replace the worker's placeholder command handler with VM boot/session plumbing while preserving the request/response protocol and `SessionBackendAdapter` surface.

## Phase 6 Local Debian Preview Shell (Implemented)

The terminal now has a usable offline shell layer while the real Debian VM image and emulator are still pending.

- `DebianPreviewShell` provides command parsing, per-session current directory state, a seeded in-memory filesystem, and shell-style output/errors.
- The worker delegates command execution to the preview shell instead of returning a generic VM-not-connected message for every unknown command.
- Supported preview commands include `help`, `pwd`, `cd`, `ls`, `cat`, `echo`, `date`, `time`, `whoami`, `id`, `hostname`, `uname`, `env`, `printenv`, `touch`, `mkdir`, `rm`, `rmdir`, `cp`, `mv`, `sudo`, `runtime`, `assets`, `clear`, and `exit`.
- Network/package commands such as `curl`, `wget`, `ping`, `apt`, and `apt-get` return explicit offline/preview-shell errors.
- Local filesystem changes are session-local and in-memory. They are not VM persistence and are not stored in `ToolState`.

This phase makes the current terminal useful for navigation and basic command testing, but it is still not the final Debian VM. The real runtime should eventually replace `DebianPreviewShell` inside the worker with VM-backed shell I/O while preserving the terminal platform, plugin host, and worker protocol.

## Phase 7 WebVM/CheerpX Runtime (Implemented)

The Debian backend now defaults to a real CheerpX/WebVM runtime path for command execution.

- `DebianSessionBackendAdapter` now uses `CheerpXDebianRuntimeClient` by default.
- `CheerpXDebianRuntimeClient` boots a Linux userspace with CheerpX mounts and IndexedDB overlay persistence.
- Runtime commands are executed through `/bin/bash -lc <command>` in the mounted Debian userspace.
- Runtime sessions are currently single-tab by design for this phase; the terminal service reuses the existing tab when the backend reports no multi-tab support.
- `debian-worker-client` and worker preview shell still exist as fallback architecture pieces, but are no longer the default runtime path.

### Important Runtime Notes

- CheerpX requires cross-origin isolation (`COOP` + `COEP`); keep `src/_headers` and `docker/nginx/default.conf` aligned.
- Simudex now loads a self-hosted CheerpX runtime module from `/assets/simudex/debian/cheerpx/cx.esm.js`.
- Root filesystem mounting resolves from `https://runtime.simudex.org/sandboxes/simudex/debian/rootfs/latest.json`.
- Rootfs and manifest URLs are restricted to a strict allowlist (same-origin or trusted R2 runtime origin).
- Cloud rootfs fallback is disabled.
- Keep CSP `connect-src` aligned with the trusted runtime origin.

## V1 Non-goals (Locked)

- No internet bridges.
- No multi-user sessions.
- No remote execution.
- The current runtime still does not include a real internet bridge, multi-user coordination, remote shell execution, or bundled Debian image assets.

## Architecture Rules

- Terminal UI must be shared across the platform and communicate only through the sandbox contracts.
- Multi-tab behavior must be implemented through session contracts first, not hardcoded in a Debian-specific component.
- Sandbox runtime engines (Debian now, others later) must implement `SessionBackendAdapter` rather than bypassing it.
- New features such as setup import/export must be added as plugins through the hook contract, not as ad-hoc runtime patches.
- Documentation must be updated with every architecture change.

## Terminal Integration Rules

- Components that need a terminal should render `TerminalPlatformComponent`; they should not create their own tab UI.
- Runtime-specific code should call `SandboxTerminalSessionService.setBackend(...)` with an adapter implementation.
- A backend adapter is responsible for booting the runtime, creating VM-side shell sessions, routing input/output, resizing sessions, and closing sessions.
- The terminal component should remain unaware of Debian, Alpine, Arch, image chunks, filesystem persistence, or worker protocol details.
- Multi-tab support is platform behavior: runtime adapters supply sessions, but they do not own global tab UI state.

## Plugin Integration Rules

- Plugins must implement `SandboxPlugin` and declare only hooks they actually implement.
- Plugins should be registered through `SandboxPluginManagerService`; do not call plugin hook methods directly from components.
- Plugin hooks must be best-effort. A plugin failure must not prevent boot, tab closure, reset, import, or export from completing.
- Plugin state must be local-only unless a future architecture document explicitly allows another boundary.
- Runtime adapters should emit platform events through services that call the plugin manager; adapters should not own plugin discovery.

## Debian Runtime Integration Rules

- Debian-specific behavior belongs in `debian-session-backend.ts`, the Debian worker, or the `minimal-debian-terminal` simulation module. Do not place Debian logic in `TerminalPlatformComponent`.
- The worker protocol in `debian-runtime.contract.ts` is the browser boundary for VM execution. Add VM commands by extending the protocol first, then adapting the backend.
- Main-thread runtime adapters should talk to Debian execution through `DebianRuntimeClient`; they should not emulate VM commands directly.
- Preview-shell behavior belongs inside the worker runtime layer and must remain replaceable by the future VM engine.
- CheerpX/WebVM runtime clients must run only when cross-origin isolation is active, and must fail loudly with a clear setup error otherwise.
- Runtime images are generated under `sandbox-images/` and published to Cloudflare R2. The app resolves Debian rootfs from the trusted runtime domain and still executes locally in the browser; do not add a remote executor.
- The root filesystem must use a dedicated future persistence layer such as OPFS or IndexedDB-backed block storage. Do not store VM filesystem contents in `ToolState`.
- Multi-tab shells must remain one platform tab to one backend session. The Debian adapter can multiplex sessions inside the VM worker, but the platform owns tab UI state.

## Commands

```bash
npm run dev:simudex
npm run build:simudex
npm run preview:simudex
npm run sitemap:simudex
```

The generic commands work too:

```bash
npm run dev:app -- --app=simudex
npm run build:app -- --app=simudex
```

## Adding The First Simulation

When a simulation is added, create a module folder under `src/simudex-simulations/`, then wire its contract/kernel in `src/core/core-registry.simudex.ts` and its Angular component loader in `src/core/tool-registry.simudex.ts`. Keep the module id, folder name, route id, and registry key identical so the existing validation scripts can protect the boundary.

The current first simulation follows this rule:

- Folder: `src/simudex-simulations/minimal-debian-terminal/`
- Registry id: `minimal-debian-terminal`
- Route: `/simulations/minimal-debian-terminal`
