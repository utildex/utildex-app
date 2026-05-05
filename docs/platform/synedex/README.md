# Synedex Platform

Synedex is the cognitive wellness and games variant of this codebase. It is built from the same repository as Utildex but produces a completely independent bundle via the dual-app build split. This document covers everything specific to Synedex: what makes it different, how its registries work, and how to add a new game.

**Prerequisite:** Read [Dual-App Build Split](../dual-app-split/README.md) first if you haven't already.

## Table of Contents

- [What Is Synedex](#what-is-synedex)
- [How It Differs from Utildex](#how-it-differs-from-utildex)
- [Synedex-Specific Files](#synedex-specific-files)
- [Directory Structure for Games](#directory-structure-for-games)
- [Adding a New Game](#adding-a-new-game)
  - [1. Create the game directory](#1-create-the-game-directory)
  - [2. Write the contract](#2-write-the-contract)
  - [3. Write the kernel](#3-write-the-kernel)
  - [4. Write the component](#4-write-the-component)
  - [5. Wire the core registry](#5-wire-the-core-registry)
  - [6. Wire the component registry](#6-wire-the-component-registry)
  - [7. Add a route](#7-add-a-route)
  - [8. Add a tool space (optional)](#8-add-a-tool-space-optional)
- [Internationalisation (i18n)](#internationalisation-i18n)
  - [Two i18n files per game](#two-i18n-files-per-game)
  - [Component strings](#component-strings)
  - [Contract metadata strings](#contract-metadata-strings)
  - [Using translations in the component](#using-translations-in-the-component)
  - [Supported languages and fallback](#supported-languages-and-fallback)
  - [Integrity check](#integrity-check)
- [Registry Architecture](#registry-architecture)
  - [core-registry.synedex.ts](#core-registrysynedexts)
  - [tool-registry.synedex.ts](#tool-registrysynedexts)
  - [appName default rule](#appname-default-rule)
- [Routes](#routes)
- [Storage](#storage)
- [What Synedex Does NOT Have](#what-synedex-does-not-have)
- [Build and Serve](#build-and-serve)
- [Pre-build Checks](#pre-build-checks)

---

## What Is Synedex

Synedex (`appId: 'synedex'`, `appName: 'Synedex'`) is a local-first platform for mindful games and cognitive exercises. It lives at `https://synedex.com`. Games are modelled identically to Utildex tools — same contract/kernel/component pattern — but they live in `src/synedex-games/` and are registered in the Synedex-specific registry files.

---

## How It Differs from Utildex

| Concern | Utildex | Synedex |
|---|---|---|
| `appId` | `utildex` | `synedex` |
| `appName` | `Utildex` | `Synedex` |
| Content directory | `src/utildex-tools/` | `src/synedex-games/` |
| Route segment for content | `tools` | `games` |
| Landing page | `pages/home/` | `pages/synedex-welcome/` |
| Root component | `app.component.ts` | `app.component.synedex.ts` |
| Route file | `app.routes.ts` | `app.routes.synedex.ts` |
| Headless/MCP build | Yes (`dist-headless/`) | **No** |
| Dashboard widget system | Yes | No |
| Storage key prefix | `utildex-` | `synedex-` |
| IDB database | `utildex-db` | `synedex-db` |

---

## Synedex-Specific Files

These files are **only** compiled into the Synedex bundle (either as replacements or as Synedex-exclusive imports):

| File | Role |
|---|---|
| `index.synedex.tsx` | Bundle entry point; bootstraps `SynedexAppComponent` |
| `app.config.synedex.ts` | Identity config (`appId`, hosting URL, etc.) |
| `src/app.component.synedex.ts` | Root shell component for Synedex |
| `src/app.routes.synedex.ts` | Complete route manifest |
| `src/core/core-registry.synedex.ts` | Contract + kernel loaders for all games |
| `src/core/tool-registry.synedex.ts` | Angular component loaders for all games |
| `src/data/tool-space-registry.synedex.ts` | Tool space definitions |
| `src/services/offline-route-loaders.synedex.ts` | SW precache scope |
| `src/pages/synedex-welcome/` | Synedex landing page component |
| `src/synedex-games/` | All game implementations |

---

## Directory Structure for Games

```
src/synedex-games/
└── <game-id>/
    ├── <game-id>.component.ts     # Angular component (UI + state)
    ├── <game-id>.contract.ts      # Metadata, type contract, widget config
    ├── <game-id>.kernel.ts        # Pure logic (no Angular dependencies)
    ├── <game-id>.schema.ts        # Zod schemas (optional, for MCP-style validation)
    └── i18n/
        ├── en.ts                  # Component i18n strings
        ├── fr.ts
        ├── es.ts
        ├── zh.ts
        └── contract.i18n.ts      # Contract name/description translations
```

Use the tool template as a starting scaffold: `src/templates/tool/`.

---

## Adding a New Game

### 1. Create the game directory

```
src/synedex-games/<game-id>/
```

Use kebab-case. The directory name **must exactly match** the `id` in the contract. This is validated at build time by `scripts/check-tool-ids.ts`.

### 2. Write the contract

```typescript
// src/synedex-games/focus-grid/focus-grid.contract.ts
import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';

export const contract: ToolContract = {
  id: 'focus-grid',
  metadata: {
    appName: 'synedex',   // Always set explicitly. Do not omit.
    name: mapLocalizedField(contractI18n, 'name'),
    description: mapLocalizedField(contractI18n, 'description'),
    icon: 'grid_view',
    version: '1.0.0',
    categories: ['Cognition'],
    tags: ['focus', 'memory', 'attention'],
    color: '#0f766e',
  },
  types: {
    input: { traits: [TRAITS.none] },
    output: { format: 'none' },
  },
  cost: 'low',
};
```

**Rules:**
- `appName: 'synedex'` must always be set explicitly. Although omitting it now defaults to `'synedex'` in the Synedex registry, setting it explicitly makes ownership unambiguous.
- `appName: 'shared'` makes the game appear in **both** Utildex and Synedex. Only use this for content that genuinely belongs to both apps.
- Widget config (`widget:`) is optional for Synedex games. Dashboard widgets are a Utildex feature. Include it only if you intend Synedex to support widgets in the future.
- The description must end with the privacy/offline guarantee in every supported language: _"No data leaves your device. Works fully offline; feel free to disconnect."_

### 3. Write the kernel

```typescript
// src/synedex-games/focus-grid/focus-grid.kernel.ts

export async function run(input: FocusGridInput): Promise<FocusGridOutput> {
  // Pure logic — no Angular, no DOM, no imports of browser-only globals at module level.
  return { ... };
}
```

The kernel is the headless-safe processing unit. Even though Synedex does not have a headless build today, keeping kernels pure is a design constraint of the platform. Do not import Angular services or browser globals at the top level.

### 4. Write the component

```typescript
// src/synedex-games/focus-grid/focus-grid.component.ts
@Component({
  selector: 'app-focus-grid',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `...`,
})
export class FocusGridComponent {
  @Input() isWidget = false;
  @Input() widgetConfig: WidgetConfig | null = null;
  // ...
}
```

Requirements mirror Utildex tools:
- `standalone: true`
- `isWidget` and `widgetConfig` inputs (even if unused — keeps the component compatible with `ToolHostComponent`)
- Zoneless: signals, computed, effect. No `ngZone.run()`.

### 5. Wire the core registry

Open `src/core/core-registry.synedex.ts` and add an entry to `CORE_REGISTRY`:

```typescript
export const CORE_REGISTRY: Record<string, CoreRegistryEntry> = {
  'focus-grid': {
    appName: 'synedex',
    contract: () =>
      import('../synedex-games/focus-grid/focus-grid.contract').then((m) => m.contract),
    kernel: () => import('../synedex-games/focus-grid/focus-grid.kernel'),
  },
};
```

Both loaders are dynamic `import()` to ensure lazy loading. The `contract` loader extracts the named export `.contract`; the `kernel` loader returns the full module namespace.

### 6. Wire the component registry

Open `src/core/tool-registry.synedex.ts` and add the component loader to `TOOL_COMPONENT_LOADERS`:

```typescript
const TOOL_COMPONENT_LOADERS: Record<string, ComponentLoader> = {
  'focus-grid': () =>
    import('../synedex-games/focus-grid/focus-grid.component').then((m) => m.FocusGridComponent),
};
```

The registry builder validates at startup that every entry in `CORE_REGISTRY` has a matching entry in `TOOL_COMPONENT_LOADERS`, and throws if any is missing.

### 7. Add a route

Open `src/app.routes.synedex.ts`. Games are routed via the shared `ToolHostComponent` under `/:lang/games/:id`. No route entry is needed for individual games because `ToolHostComponent` resolves the game ID dynamically from the route parameter.

If your game needs a **dedicated page** (not just `ToolHostComponent`), add a route under the `:lang` children block:

```typescript
{
  path: 'games/focus-grid/challenge',
  loadComponent: () =>
    import('./pages/focus-grid-challenge/focus-grid-challenge.component')
      .then((m) => m.FocusGridChallengeComponent),
  title: 'Focus Grid Challenge - Synedex',
},
```

Keep the Synedex route manifest intentionally minimal. Do not add Utildex-only routes (articles, home, tool-detail, etc.) unless you intend them to be part of Synedex.

### 8. Add a tool space (optional)

Tool spaces for Synedex are declared in `src/data/tool-space-registry.synedex.ts`. Spaces group games into task-oriented collections displayed in the UI. See [Tool Spaces Platform](../tool-spaces/README.md) for full details.

---

## Internationalisation (i18n)

Every game has two separate i18n concerns: **component strings** (UI labels, button text, error messages) and **contract metadata strings** (name and description shown in listings). These are kept in separate files for a deliberate reason — contract metadata is loaded at build time by the registry, while component strings are loaded lazily at runtime when the user opens the game.

### Two i18n files per game

```
src/synedex-games/<game-id>/i18n/
├── en.ts              ← component strings (English, the reference)
├── fr.ts              ← component strings (French)
├── es.ts              ← component strings (Spanish)
├── zh.ts              ← component strings (Chinese)
└── contract.i18n.ts   ← contract name + description, all languages in one file
```

### Component strings

Each language file is a plain `export default` object with flat string keys:

```typescript
// src/synedex-games/focus-grid/i18n/en.ts
export default {
  BTN_START: 'Start',
  BTN_PAUSE: 'Pause',
  LABEL_SCORE: 'Score',
  LABEL_LEVEL: 'Level',
  MSG_GAME_OVER: 'Game over',
};
```

```typescript
// src/synedex-games/focus-grid/i18n/fr.ts
export default {
  BTN_START: 'Démarrer',
  BTN_PAUSE: 'Pause',
  LABEL_SCORE: 'Score',
  LABEL_LEVEL: 'Niveau',
  MSG_GAME_OVER: 'Partie terminée',
};
```

Rules:
- Keys are `SCREAMING_SNAKE_CASE` strings.
- Values are plain strings only — no interpolation markers, no nested objects. If a string needs a dynamic value, compose it in the component with string concatenation.
- Every key present in `en.ts` must also be present in every other language file. The integrity check (`scripts/check-integrity.ts`) enforces this and fails the build if any key is missing.
- Extra keys in non-English files (keys not in `en.ts`) produce a build **warning**, not an error — but they are dead code and should be removed.

### Contract metadata strings

`contract.i18n.ts` is a **multi-language dictionary** in a single file, organised language-first:

```typescript
// src/synedex-games/focus-grid/i18n/contract.i18n.ts
export const contractI18n = {
  en: {
    name: 'Focus Grid',
    description:
      'Train your attention and spatial memory with a progressive grid challenge. No data leaves your device. Works fully offline; feel free to disconnect.',
  },
  fr: {
    name: 'Grille de Concentration',
    description:
      'Entraînez votre attention et votre mémoire spatiale. Aucune donnée ne quitte votre appareil. Fonctionne entièrement hors ligne ; vous pouvez couper internet.',
  },
  es: {
    name: 'Cuadrícula de Concentración',
    description:
      'Entrena tu atención y memoria espacial. Ningún dato sale de tu dispositivo. Funciona completamente sin conexión; puedes desconectar internet.',
  },
  zh: {
    name: '专注方格',
    description:
      '通过渐进式方格挑战训练您的注意力和空间记忆。您的数据不会离开设备。完全离线运行，请随意断开网络。',
  },
} as const;
```

This dictionary is consumed by `mapLocalizedField` from `src/core/i18n-mapper.ts` to produce the `Record<string, string>` objects expected by `ToolContract`:

```typescript
// focus-grid.contract.ts
import { mapLocalizedField } from '../../core/i18n-mapper';
import { contractI18n } from './i18n/contract.i18n';

metadata: {
  name: mapLocalizedField(contractI18n, 'name'),
  description: mapLocalizedField(contractI18n, 'description'),
}
```

`mapLocalizedField` walks the dictionary and extracts `{ en: '...', fr: '...', es: '...', zh: '...' }` for the given key. The integrity check does **not** cover `contract.i18n.ts` — you must manually ensure all four languages are present.

The description must always end with the privacy/offline guarantee in every language. See `CONTRIBUTING.md` for the required phrasing per language.

### Using translations in the component

Inject `ScopedTranslationService` (provided via `provideTranslation`) and access the reactive translation map via `t.map()`:

```typescript
// focus-grid.component.ts
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <button>{{ t.map()['BTN_START'] }}</button>
    <span>{{ t.map()['LABEL_SCORE'] }}: {{ score() }}</span>
  `,
})
export class FocusGridComponent {
  t = inject(ScopedTranslationService);
}
```

`provideTranslation` registers both the loader map and `ScopedTranslationService` as component-scoped providers. `t.map()` is a signal — Angular will re-render automatically when the user switches language.

To read a single string imperatively (e.g. for a toast message), use `t.get('KEY')`:

```typescript
this.toast.show(this.t.get('MSG_GAME_OVER'), 'info');
```

### Supported languages and fallback

The four supported languages are `en`, `fr`, `es`, `zh`. If the user's active language has no loader (or the loader throws), `ScopedTranslationService` automatically falls back to `en`. You must always provide all four loaders in `provideTranslation`.

### Integrity check

`scripts/check-integrity.ts` validates component i18n automatically as part of the pre-build step. For each game in `src/synedex-games/`, it:

1. Confirms that `en.ts`, `fr.ts`, `es.ts`, and `zh.ts` all exist.
2. Loads all four files and compares their key sets against `en.ts`.
3. Errors on any missing key; warns on any extra key.

A failed integrity check blocks the build. Fix it by adding the missing key to the relevant language file before re-running.

---

## Registry Architecture

### core-registry.synedex.ts

`CORE_REGISTRY` is the **source of truth** for which games exist in Synedex. Each entry provides:
- `appName`: ownership tag. Set to `'synedex'` for Synedex-only games, `'shared'` for content shown in both apps.
- `contract`: lazy loader returning the `ToolContract`.
- `kernel`: lazy loader returning the kernel module.

`getCoreRegistryForApp('synedex')` filters entries by `appName`, producing the subset of games that belong to this build.

### tool-registry.synedex.ts

`TOOL_COMPONENT_LOADERS` maps game IDs to their Angular component loaders. The registry builder (`buildToolRegistryMap`) joins this map with the filtered core registry, validates completeness, and exposes `TOOL_REGISTRY_MAP`.

The two-registry design separates the **framework-agnostic** layer (contract + kernel — no Angular imports) from the **Angular** layer (component). This keeps kernels portable and usable in non-Angular contexts without pulling in Angular's DI.

### appName default rule

Omitting `appName` in a `CORE_REGISTRY` entry defaults to `'synedex'` (not `'shared'`). This is intentional: a newly added entry should be Synedex-only by default and must opt in to `'shared'` or `'utildex'` explicitly. Always set `appName` explicitly in contracts to avoid relying on the default.

---

## Routes

Synedex routes live exclusively in `src/app.routes.synedex.ts`. The structure:

```
/:lang                       ← language segment, validated by languageGuard
  /                          ← Synedex welcome page (SynedexWelcomeComponent)
  /games                     ← All games list (AllToolsComponent)
  /games/:id                 ← Individual game (ToolHostComponent)
  /legal                     ← Legal notice
  /terms                     ← Terms of use
  /categories                ← Category list
  /categories/:id            ← Category detail
  /articles                  ← Articles
  /articles/:id              ← Article detail
```

`app.routes.ts` (the Utildex routes) is **never included** in the Synedex bundle. They are loaded from separate entry points (`index.tsx` vs `index.synedex.tsx`).

---

## Storage

All storage keys for Synedex are prefixed with `synedex-` because `STORAGE_KEYS` derives its values from `APP_CONFIG.appId = 'synedex'`. The IDB database is `synedex-db`. This means Utildex and Synedex data are fully isolated — a factory reset in one app does not affect the other.

**Preference keys** (theme, lang, color, font, density, tool-space, tool-space-last-tools) are shared concepts but stored under `synedex-state-<pref>`, separate from `utildex-state-<pref>`. A user can have independent theme settings per app.

---

## What Synedex Does NOT Have

- **Headless / MCP build.** There is no `npm run build:headless` for Synedex. Game kernels should still be pure (no Angular/DOM at the top level), but they are not exposed via any Node API today.
- **Dashboard widget system.** The Utildex dashboard (drag-and-drop widget grid) is wired into `app.routes.ts` which Synedex does not use. Do not implement widget-related features in `app.routes.synedex.ts` or `app.component.synedex.ts` without deliberate intent to ship them.
- **Tour overlay.** The guided onboarding tour (`TourService`) is disabled in the Synedex settings modal via an `@if (appConfig.appId !== 'synedex')` guard.
- **MCP manifest generation.** The pre-build `generate-mcp-manifest.ts` script targets Utildex tools only.

---

## Build and Serve

```bash
# Production build
ng build --configuration=synedex
# → dist/synedex/

# Development server
ng serve --configuration=synedex
# → http://localhost:3000 (Synedex identity, live reload)
```

The Synedex build uses `index.synedex.html` as its HTML template (output as `index.html`), the `ngsw-config.synedex.json` service worker config, and excludes the `src/assets/mcp/` directory from the asset bundle.

---

## Pre-build Checks

The standard pre-build scripts run for Synedex too:

| Script | What it checks |
|---|---|
| `scripts/check-tool-ids.ts` | `contract.id` matches the folder name for every game in `src/synedex-games/` |
| `scripts/check-integrity.ts` | i18n key parity across all supported languages for every game |
| `scripts/check-app-parity.ts` | Registry sync (every entry in `CORE_REGISTRY` has a matching component loader) |

Run `npm run build` or `ng build --configuration=synedex` to trigger them. Fix any reported mismatches before merging.
