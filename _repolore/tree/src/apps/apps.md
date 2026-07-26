# src/apps/ — Multi-App Architecture

One Angular project produces three independent apps via `fileReplacements` in `angular.json`. Each app has its own entry point, shell, routes, registries, storage namespace, and capabilities.

## The three apps

| App | Route | Kind | Modules | Capabilities | MCP | Port | URL |
|-----|-------|------|---------|-------------|-----|------|-----|
| **Utildex** | `/tools` | tool | 33 | all enabled | yes | 3000 | utildex.com |
| **Synedex** | `/games` | game | 2 (mental-math, sudoku) | all disabled | no | 3001 | synedex.com |
| **Simudex** | `/simulations` | simulation | 1 (minimal-debian-terminal) | all disabled | no | 3002 | simudex.org |

All three are declared in `src/core/app-catalog.ts` as the `APP_CATALOG` record.

Utildex is the default build configuration (no `fileReplacements` needed). Synedex and Simudex each have 6 `fileReplacements` that swap in their own versions of the entry point, app config, core registry, module registry, tool-space registry, and offline route loaders.

## How the split works

### fileReplacements
`angular.json` declares one project (`app`) with four build configurations: `production`, `utildex`, `synedex`, `simudex`. The `utildex` config has no `fileReplacements` (it's the default). `synedex` and `simudex` each replace 6 files:

```
utildex (default)           →  synedex variant                →  simudex variant
─────────────────────────────────────────────────────────────────────────────────
entry/index.tsx             →  entry/index.tsx                 →  entry/index.tsx
entry/app.config.ts         →  entry/app.config.ts             →  entry/app.config.ts
core-registry.ts            →  core-registry.synedex.ts        →  core-registry.simudex.ts
module-registry.ts          →  module-registry.ts              →  module-registry.ts
tool-space-registry.ts      →  tool-space-registry.synedex.ts  →  tool-space-registry.simudex.ts
offline-route-loaders.ts    →  offline-route-loaders.synedex.ts→  offline-route-loaders.simudex.ts
```

Shell components and routes are imported directly from app-specific paths (`src/apps/synedex/shell/app.component.ts`, `src/apps/synedex/routing/app.routes.ts`), not via replacements.

### Capability gating
`APP_CONFIG` token provides `AppCapabilities` at runtime. Shared code (components, services, pages) checks these boolean flags to show/hide features:

```typescript
// Example: only show dashboard if the app supports it
if (appConfig.capabilities.dashboard) { /* ... */ }
```

Utildex has all 9 capabilities enabled. Synedex and Simudex have all disabled.

### Storage namespacing
`STORAGE_KEYS` (in `src/core/storage-keys.ts`) prefixes all storage keys:
- `utildex-*` — Utildex IndexedDB databases and localStorage keys
- `synedex-*` — Synedex storage
- `simudex-*` — Simudex storage

This prevents cross-app data leakage when multiple apps run on the same origin.

## Per-app structure

Each app follows the same directory layout under `src/apps/<appId>/`:

```
<appId>/
  entry/                  # Bootstrap: index.tsx, index.html, app.config.ts, manifest, ngsw-config
  shell/                  # Root Angular component + template
  routing/                # App-specific route configuration
  core-registry.ts        # Lazy-loads module contracts + kernels
  module-registry.ts      # Lazy-loads Angular components
  tool-space-registry.ts  # Tool space definitions
  offline-route-loaders.ts# Offline route preloading
  seo/                    # SEO assets (robots.txt, sitemap templates)
  <kind-plural>/          # Content modules (tools/, games/, simulations/)
  article-registry.ts     # Utildex only — article lazy-loading
```

## Build and run

```bash
npm run dev:utildex     # Serve Utildex on port 3000
npm run dev:synedex     # Serve Synedex on port 3001
npm run dev:simudex     # Serve Simudex on port 3002

npm run build:all       # Build all three apps
npm run build:utildex   # Build Utildex → dist/utildex/
npm run build:synedex   # Build Synedex → dist/synedex/
npm run build:simudex   # Build Simudex → dist/simudex/
```

Docker builds produce three containers (ports 9526, 9527, 9528) via `docker-compose.yml`.

## Related RepoLore

- `_repolore/tree/src/apps/utildex/utildex.md` — Utildex specifics
- `_repolore/tree/src/apps/synedex/synedex.md` — Synedex specifics
- `_repolore/tree/src/apps/simudex/simudex.md` — Simudex specifics
- `_repolore/tree/src/core/core.md` — platform contracts and app catalog
- `_repolore/tree/scripts/scripts.md` — build pipeline and scaffold CLI

## Related human docs

- `docs/platform/multi-app/README.md` — full multi-app architecture
- `docs/platform/multi-app/restructuring-plan.md` — PR1-PR6 roadmap (PR5/PR6 still pending)
- `docs/platform/multi-app/scaffolding.md` — `create-app` / `create-module` CLI usage
- `docs/platform/dual-app-split/README.md` — historical 2-app split (pre-Simudex)

