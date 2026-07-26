# src/services/ — Service Layer

Angular services organized into four categories. All use `@Injectable({ providedIn: 'root' })` (tree-shakeable singletons), signals for reactive state, and `inject()` for DI. No human docs exist for this layer — this RepoLore node is the primary reference.

## `data/` — Persistence & State

| Service | Role |
|---------|------|
| `DbService` | IndexedDB wrapper with in-memory fallback. Three stores per DB: `CONFIG`, `RECORDS`, `BLOBS`. DB names: `utildex-db`, `synedex-db`, `simudex-db`. Version 2 schema. |
| `PersistenceService` | Signal-to-storage bridge. Syncs `WritableSignal<T>` to IndexedDB or localStorage. `'hybrid'` strategy: instant localStorage read + durable IDB write. Handles type coercion. |
| `StorageManagerService` | Storage space UI data — categorizes stored data by type, computes size/count stats. |
| `ClipboardService` | System clipboard + history list persisted in IDB. Fires toast on copy. |
| `ToolState` | Generic class (not service). Wraps `WritableSignal<T>` with IDB persistence. `select<K>(key)` returns derived `Signal<T[K]>`. |

## `modules/` — Module/Tool Resolution

| Service | Role |
|---------|------|
| `ModuleService` | **Central module registry**. Resolves all modules from `MODULE_REGISTRY_MAP`. Provides categorized lists, i18n search/filter, widget layout, dashboard placement, usage stats. |
| `ToolSpacesService` | Tool space orchestration — manages `ToolSpaceDefinition`, selected space, validation, prunes invalid selections. |
| `ArticleService` | Article/content manager — loads metadata from `ARTICLE_REGISTRY`, featured/recent lists, fetches Markdown via `HttpClient`. |
| `SandboxTerminalSessionService` | Simudex terminal session manager — CheerpX/WebVM tabs, sessions, I/O streaming, backend adapter boot. |
| `SandboxPluginManagerService` | Simudex plugin lifecycle — hooks: `onSandboxBoot`, `onTabCreate/Close`, `onBeforeFilesystemReset`, `onFileImport/Export`. |

## `platform/` — Environment & Platform

| Service | Role |
|---------|------|
| `AppConfigService` | App identity — exposes `appId`, `appName`, `toolsRouteSegment`, `capabilities`, `githubUrl`. Resolves public base URLs. |
| `AppUpdateService` | Service Worker update detection — polls `SwUpdate.versionUpdates` every 10 min + on `online`/`visibilitychange`. |
| `NetworkService` | Online/offline `isOnline` signal. SSR-safe. |
| `OfflineManagerService` | Downloads tool bundles for offline use. Tracks progress. Abortable via `AbortController`. |
| `SeoService` | `<title>`, `<meta>`, canonical URLs, Open Graph, hreflang alternates. Reacts to route + language changes. |
| `ShortcutService` | Keyboard shortcut registry — modifier support (ctrl/meta, alt, shift). Skips when focus is in input elements. |
| `GlobalErrorService` | Error boundary — captures unhandled errors as `AppError` signal. |
| `FontLoaderService` | Dynamic `FontFace` API loading — Inter (400/500/600/700), Roboto Mono (400). Watches DOM for new `font-family` via `MutationObserver`. |

## `ui/` — UI State

| Service | Role |
|---------|------|
| `I18nService` | Locale management — `currentLang` signal (en/fr/es/zh), reads from URL route, persists, sets `document.documentElement.lang`. |
| `ThemeService` | Dark/light theme, primary color (5 options), font family, density. Applies CSS custom properties + dark class to `<html>`. Persisted. |
| `ToastService` | Toast notifications — configurable duration, 3 types (`success`, `error`, `info`), auto-dismiss. |
| `GuideService` | Contextual tooltips — anchored or centered, position-aware, auto-hide. |
| `TourService` | Multi-step onboarding tour with `TOUR_STEPS` config. Tracks step + dismissal state (persisted). |
| `VirtualPetsService` | Virtual pets — enable/disable, active pets list, custom sprite resolution. Utildex only. |

## Patterns

- **`inject()` DI** — no constructor injection, all services use `inject()` at top of class
- **Signals** — `signal()`, `computed()`, `effect()` for all reactive state
- **SSR safety** — guards: `typeof window !== 'undefined'`, `isPlatformBrowser()`
- **App namespacing** — `APP_CONFIG.appId` prefixes all storage keys and DB names
- **Co-located specs** — `*.spec.ts` alongside `*.ts`

## Common pitfalls

- `ModuleService` is the most coupled service — changes to module contracts, registries, or widget config all flow through it
- `PersistenceService` `'hybrid'` strategy: localStorage is instant but size-limited (~5MB); IDB is durable but async. Write-through to both, read from localStorage first
- `AppConfigService.capabilities` is the gate for all feature flags — if a check is missing, features leak to Synedex/Simudex
- Sandbox services (`SandboxTerminalSessionService`, `SandboxPluginManagerService`) only have effect in Simudex context

## Related

- → Read: `_repolore/tree/src/core/core.md` for contracts these services consume (ModuleContract, AppConfig, ToolSpaceDefinition)
- → Read: `_repolore/tree/src/apps/apps.md` for capability gating and storage namespacing
- → Read: `_repolore/tree/src/components/components.md` for components that consume these services

