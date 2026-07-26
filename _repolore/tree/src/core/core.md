# src/core/ — Platform Contracts

The backbone of the platform. Every shared contract, registry, and cross-cutting subsystem lives here. Changes to `src/core/` affect all three apps (utildex, synedex, simudex).

## Key contracts

### App catalog (`app-catalog.ts`)
Single source of truth for app identity. Declares `APP_CATALOG` — a `Record<AppId, AppCatalogEntry>` with three entries (`utildex`, `synedex`, `simudex`). Each entry defines: app name, route segment, capabilities (booleans for articles/dashboard/headless/MCP/spaces/etc.), hosting URL, build configuration, output path, dev server port, and source file paths (entry point, shell, routes, registries, SEO). All `check:*` scripts validate against this. **Any new app must be added here first.**

### Module contract (`module-contract.ts`)
`ModuleContract` — the unified interface for all runnable modules (tools, games, simulations):

- `id` — unique, matches route and registry key
- `metadata` — i18n name/description, icon, categories, tags, `appName` ownership (`AppId | 'shared'`)
- `types` — input traits and output format for pipeline orchestration
- `schema` — optional Zod schemas for MCP/pipeline validation
- `mcp.compatible` — boolean; only utildex tool modules default to true
- `widget` — dashboard widget capability config
- `cost` — computational cost hint (`'low' | 'medium' | 'high'`)

### Tool spaces (`tool-space.ts` + `tool-space-resolver.ts`)
`ToolSpaceDefinition` groups tools into task-oriented collections (Developer, Office, Health, etc.) with nested `ToolSpaceGroupDefinition` groups. The resolver validates space definitions (duplicate IDs, unknown tool refs, empty groups) and resolves them per app. Also drives MCP space discovery. → Read: `docs/platform/tool-spaces/README.md`

### I18n core (`i18n.ts` + `i18n-mapper.ts`)
`I18nText` type: `string | { [lang: string]: string }`. `I18N_MAP` injection token for per-module translation loaders. `ScopedTranslationService` provides lazy-loaded, locale-aware translations to components with automatic `en` fallback. `I18nService` (in `src/services/ui/`) resolves translations globally. 4 languages: `en`, `fr`, `es`, `zh`. Integrity enforced by `scripts/check-integrity.ts`.

### App config (`app.config.ts`)
`AppConfig` type and `APP_CONFIG` injection token. Injected at bootstrap with app-specific identity, capabilities, and hosting info. Capability flags (`capabilities.dashboard`, `capabilities.headless`, etc.) gate feature visibility across all shared code.

### Storage keys (`storage-keys.ts`)
Declares `STORAGE_KEYS` constants. Storage is namespaced: `utildex-`, `synedex-`, `simudex-` prefixes prevent cross-app data leakage in IndexedDB and localStorage.

## Subsystems

### Pretty plotting (`plotting/pretty/`)
D3-based reusable charting library. Config contracts, presets (line, bar, scatter, etc.), modifier pipeline, renderer lifecycle, and export hooks. → Read: `docs/platform/pretty-plotting/README.md`

### GIF export (`export/` + `workers/gif/`)
Centralized GIF rendering and encoding pipeline. `SharedExportRenderer` for canvas-based frame capture, `encodeGifWithRuntimeWorker` for Web Worker-based encoding. Quality profiles: `reliable`, `balanced`, `compact`. Anti-banding support. → Read: `docs/platform/gif-export/README.md`

### Sandbox contracts (`sandbox/`)
Contracts for the Simudex terminal platform:
- `TerminalPlatformContract` + `SandboxPluginContract` — plugin host interfaces
- `SessionBackendContract` + `DebianRuntimeContract` — session lifecycle
- `DebianWorkerClient` + `CheerpxRuntimeClient` — Web Worker bridge to CheerpX/WebVM
- `MockSessionBackend` + `NoopSandboxPlugin` — test doubles
→ Read: `docs/platform/simudex/README.md`

### Guards and pipes (`guards/`, `pipes/`)
`LanguageGuard` — route guard for language validation. `LocalLinkPipe` — transforms internal links.

### Other
- `module-core-registry.ts` + `module-registry.ts` — lazy-loading registry infrastructure for module kernels and components
- `runtime-resources.ts` — runtime resource management
- `tour.config.ts` — guided tour configuration
- `global-error-handler.ts` — centralized error handling
- `planner/` — task planning/scheduling
- `types/` — shared TypeScript types (traits, formats, shared utility types)

## Patterns

- **Lazy loading everywhere**: module kernels and components are loaded via dynamic `import()`, not bundled eagerly
- **Angular signals + `inject()`**: services use signals for state and DI `inject()` throughout
- **`@/*` path alias** maps to repo root — e.g., `import { ModuleContract } from '@/src/core/module-contract.ts'`
- **`providedIn: 'root'`**: most services are tree-shakeable singletons

## Invariants

- `app-catalog.ts` must be updated before any new app scaffolding
- Module contracts require unique IDs per app scope
- Capability flags in `app.config.ts` must match `app-catalog.ts`
- Storage keys must stay namespaced — never use un-prefixed keys
- Headless bundle (`src/headless/`) reuses module contracts and types from `src/core/` but must not import Angular code

## Common pitfalls

- **Shared core, three apps**: a change to `module-contract.ts` or `app-catalog.ts` impacts all three apps. Test with `build:all`.
- **fileReplacements confusion**: files like `core-registry.ts` are replaced per app at build time. The `utildex` version is the default; `synedex` and `simudex` have `.synedex.ts` / `.simudex.ts` variants.
- **Capability gate leakage**: if a feature is gated by `capabilities.dashboard` but the check is missing in shared code, it may silently appear in Synedex/Simudex where it should be disabled.
- **Module vocabulary mismatch**: PR3 is migrating terminology from "tools" to "modules". `ModuleContract` uses the new vocabulary; some legacy identifiers (e.g., `toolsRouteSegment`, `tool-space-registry.ts`) still use old names.
