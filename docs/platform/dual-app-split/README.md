# Dual-App Build Split

This document describes how a single codebase produces two completely independent applications: **Utildex** (tools platform) and **Synedex** (cognitive wellness games platform). Understanding this mechanism is required before modifying any file that is shared between the two apps.

## Table of Contents

- [Overview](#overview)
- [How the Split Works](#how-the-split-works)
  - [Entry Points](#entry-points)
  - [The Six File Replacements](#the-six-file-replacements)
- [APP\_CONFIG: the Identity Layer](#app_config-the-identity-layer)
- [Storage Namespacing](#storage-namespacing)
  - [LocalStorage / SessionStorage keys](#localstorage--sessionstorage-keys)
  - [IndexedDB database name](#indexeddb-database-name)
  - [Pre-Angular theme key (theme-init.js)](#pre-angular-theme-key-theme-initjs)
- [What IS and IS NOT Shared](#what-is-and-is-not-shared)
- [Build and Serve Commands](#build-and-serve-commands)
- [Adding a New File Replacement](#adding-a-new-file-replacement)
- [Invariants and Rules](#invariants-and-rules)

---

## Overview

The repository has one Angular project configured in `angular.json`. Two named build configurations (`utildex` and `synedex`) produce separate distributable bundles. The Synedex build swaps a fixed set of files at compile time — Angular's `fileReplacements` mechanism — and uses a different HTML entry point. No runtime feature-flagging is involved: each bundle contains only the code that belongs to its app.

```
Repository
├── index.tsx                  ← Utildex entry point
├── index.synedex.tsx          ← Synedex entry point  (swaps index.tsx)
├── app.config.ts              ← Utildex identity
├── app.config.synedex.ts      ← Synedex identity     (swaps app.config.ts)
└── src/
    ├── core/
    │   ├── core-registry.ts           ← Utildex tool loaders
    │   └── core-registry.synedex.ts   ← Synedex game loaders
    │   ├── tool-registry.ts           ← Utildex component loaders
    │   └── tool-registry.synedex.ts   ← Synedex component loaders
    ├── data/
    │   ├── tool-space-registry.ts           ← Utildex spaces
    │   └── tool-space-registry.synedex.ts   ← Synedex spaces
    └── services/
        ├── offline-route-loaders.ts           ← Utildex offline routes
        └── offline-route-loaders.synedex.ts   ← Synedex offline routes
```

---

## How the Split Works

### Entry Points

**Utildex** (`index.tsx`) bootstraps `AppComponent` with `routes` from `app.routes.ts`:

```typescript
// index.tsx (Utildex)
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';
```

**Synedex** (`index.synedex.tsx`) bootstraps `SynedexAppComponent` with `routes` from `app.routes.synedex.ts`:

```typescript
// index.synedex.tsx (Synedex)
import { SynedexAppComponent } from './src/app.component.synedex';
import { routes } from './src/app.routes.synedex';
```

Because the entry points are entirely separate, `app.routes.ts` is **never included** in the Synedex bundle, and vice versa. There is no runtime route filtering.

### The Six File Replacements

During the `synedex` build, Angular replaces these files before compilation:

| Replaced file | Replacement | Purpose |
|---|---|---|
| `index.tsx` | `index.synedex.tsx` | Bootstraps `SynedexAppComponent` and Synedex routes |
| `app.config.ts` | `app.config.synedex.ts` | Sets `appId`, `appName`, `toolsRouteSegment`, and hosting URL |
| `src/core/core-registry.ts` | `src/core/core-registry.synedex.ts` | Declares game contract and kernel loaders |
| `src/core/tool-registry.ts` | `src/core/tool-registry.synedex.ts` | Declares Angular component loaders for games |
| `src/data/tool-space-registry.ts` | `src/data/tool-space-registry.synedex.ts` | Declares Synedex-specific tool spaces |
| `src/services/offline-route-loaders.ts` | `src/services/offline-route-loaders.synedex.ts` | Offline precache scope for Synedex |

Everything else — services, components, directives, i18n core, pipes, theme, storage layer — is compiled from the **same** source for both apps. APP_CONFIG (see below) is the mechanism that makes shared code behave differently at runtime.

---

## APP_CONFIG: the Identity Layer

`app.config.ts` (root, not `src/core/app.config.ts`) is the only file that differs between the two apps regarding identity. It exports `APP_CONFIG_DATA`:

```typescript
// app.config.ts (Utildex)
export const APP_CONFIG_DATA = {
  appId: 'utildex',
  appName: 'Utildex',
  toolsRouteSegment: 'tools',
  hosting: { defaultPublicBaseUrl: 'https://utildex.com' },
  githubUrl: 'https://github.com/utildex/utildex',
} as const;

// app.config.synedex.ts (Synedex)
export const APP_CONFIG_DATA = {
  appId: 'synedex',
  appName: 'Synedex',
  toolsRouteSegment: 'games',
  hosting: { defaultPublicBaseUrl: 'https://synedex.com' },
  githubUrl: 'https://github.com/synedex',
} as const;
```

`src/core/app.config.ts` re-exports this as `APP_CONFIG` and exposes helpers:

```typescript
import { APP_CONFIG_DATA } from '../../app.config'; // resolved at build time

export const APP_CONFIG = APP_CONFIG_DATA;
export function getAppId(): AppId { ... }
export function resolvePublicBaseUrl(...): string { ... }
```

Because the root `app.config.ts` is resolved at build time, `APP_CONFIG` is a compile-time constant for tree-shaking purposes — the unused app's values are not present in the bundle.

**Rules for using APP_CONFIG:**
- Import `APP_CONFIG` from `'../../core/app.config'` (or the appropriate relative path to `src/core/app.config.ts`), never from the root config file directly.
- Never hardcode `'utildex'` or `'synedex'` as string literals in shared code. Always branch on `APP_CONFIG.appId`.
- Do not add new top-level keys to `APP_CONFIG_DATA` unless both `app.config.ts` and `app.config.synedex.ts` are updated simultaneously.

---

## Storage Namespacing

Both apps may run on the same origin in some deployment scenarios (e.g., `utildex.com/app` and `synedex.com/app` sharing a localhost dev server, or both served under one domain). All storage keys are therefore namespaced per app to prevent data collisions.

### LocalStorage / SessionStorage keys

`src/core/storage-keys.ts` derives all key values from `APP_CONFIG.appId` at module initialisation time:

```typescript
import { APP_CONFIG } from './app.config';

const appId = APP_CONFIG.appId as string;

export const STORAGE_KEYS = {
  DASHBOARD_V2:      `${appId}-dashboard-v2`,
  FAVORITES:         `${appId}-favorites`,
  CLIPBOARD_HISTORY: `${appId}-clipboard-history`,
  USAGE_STATS:       `${appId}-usage`,
  PREFIX_STATE:      `${appId}-state-`,
  PREFIX_TOOLS:      'tools.',
  PREFIX_APP:        `${appId}-`,
  PREFERENCES: ['theme', 'lang', 'color', 'font', 'density', 'tool-space', 'tool-space-last-tools'] as const,
};

export function getPrefKey(pref: string): string {
  return `${STORAGE_KEYS.PREFIX_STATE}${pref}`;
}
```

**Rule:** All new localStorage/sessionStorage keys must be defined through `STORAGE_KEYS` or `getPrefKey()`. Never write a raw string literal like `'utildex-...'` in shared service or component code.

### IndexedDB database name

`DbService` uses `APP_CONFIG.appId` to build the database name:

```typescript
private readonly dbName = `${APP_CONFIG.appId as string}-db`;
// → 'utildex-db' for Utildex, 'synedex-db' for Synedex
```

This ensures the two apps have entirely separate IDB databases on the same origin.

### Pre-Angular theme key (theme-init.js)

`src/assets/theme-init.js` runs as an inline script before Angular boots, to apply the saved dark/light class without a flash. It cannot import TypeScript modules, so it reads the app ID from a `<meta>` tag injected into each HTML entry point:

```html
<!-- index.html -->
<meta name="app-id" content="utildex" />

<!-- index.synedex.html -->
<meta name="app-id" content="synedex" />
```

The script then derives the localStorage key at runtime:

```javascript
var appId = (document.querySelector('meta[name="app-id"]') || {}).content || 'utildex';
var saved = localStorage.getItem(appId + '-state-theme');
```

**Rule:** If you add a new HTML entry point for a future app, add the corresponding `<meta name="app-id">` tag.

---

## What IS and IS NOT Shared

### Shared (same source file, both builds)

- All Angular services (`src/services/`)
- All Angular components (`src/components/`)
- Core utilities: `i18n`, `pipes`, directives, guards
- Storage layer: `DbService`, `StorageManagerService`, `STORAGE_KEYS`
- Theme, offline, tour, virtual pets
- The tool contract type definition (`src/core/tool-contract.ts`)
- All shared data types (`src/data/types.ts`, traits, formats)
- The tool-spaces resolution logic (`src/core/tool-space-resolver.ts`)

### Split per app (different file, same import path)

| Import path | Utildex file | Synedex file |
|---|---|---|
| `../../app.config` | `app.config.ts` | `app.config.synedex.ts` |
| Entry point | `index.tsx` | `index.synedex.tsx` |
| `./core-registry` | `core-registry.ts` | `core-registry.synedex.ts` |
| `./tool-registry` | `tool-registry.ts` | `tool-registry.synedex.ts` |
| `../data/tool-space-registry` | `tool-space-registry.ts` | `tool-space-registry.synedex.ts` |
| `./offline-route-loaders` | `offline-route-loaders.ts` | `offline-route-loaders.synedex.ts` |

### Utildex-only (not bundled into Synedex)

- `src/app.component.ts` and `app.routes.ts`
- `src/utildex-tools/` — all tool components, contracts, kernels
- Dashboard widget system (Utildex routes include it; Synedex routes do not)
- Headless/MCP build (`dist-headless/`) — Synedex does **not** have a headless build

### Synedex-only (not bundled into Utildex)

- `src/app.component.synedex.ts` and `app.routes.synedex.ts`
- `src/synedex-games/` — all game components, contracts, kernels
- `src/pages/synedex-welcome/` — Synedex landing page

---

## Build and Serve Commands

```bash
# Build Utildex (production)
ng build --configuration=utildex

# Build Synedex (production)
ng build --configuration=synedex

# Serve Utildex (dev)
ng serve --configuration=development

# Serve Synedex (dev)
ng serve --configuration=synedex
```

Output paths:
- Utildex → `dist/utildex/`
- Synedex → `dist/synedex/`

---

## Adding a New File Replacement

If a new file needs to behave differently between the two apps:

1. Create the Utildex version at its canonical path (e.g., `src/services/foo.service.ts`).
2. Create the Synedex version at the sibling path (e.g., `src/services/foo.service.synedex.ts`).
3. Add a `fileReplacements` entry to the `synedex` configuration block in `angular.json`:
   ```json
   { "replace": "src/services/foo.service.ts", "with": "src/services/foo.service.synedex.ts" }
   ```
4. Both files must export the same public API (same exported symbols, compatible types).
5. Document the reason for the split in a comment at the top of both files.

---

## Invariants and Rules

1. **No runtime feature flags for the app split.** Use `fileReplacements` instead. A conditional like `if (APP_CONFIG.appId === 'synedex')` in a shared service is acceptable for minor divergence, but a structural difference should use a replacement file.
2. **No `utildex-` or `synedex-` hardcoded string literals in shared code.** Derive from `APP_CONFIG.appId` or `STORAGE_KEYS`.
3. **Both `app.config.ts` variants must stay structurally identical.** Adding a key to one requires adding it to the other.
4. **The `PREFERENCES` array in `storage-keys.ts` is shared** — any key added there applies to both apps. If a preference is app-specific, handle it separately outside that array.
5. **`src/core/app.config.ts` is the canonical import point** for `APP_CONFIG`. Never import from the root `app.config.ts` directly in `src/`.
