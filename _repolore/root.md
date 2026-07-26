# Utildex (utildex-app)

Angular 21 multi-app monorepo. Offline-first PWA tools platform.

One Angular project → three independent apps built via `fileReplacements` in `angular.json`. Each app has its own identity, capabilities, route segment, and storage namespace. The app catalog (`src/core/app-catalog.ts`) is the single source of truth.

## Apps

| App | Route | Kind | Modules | Capabilities | MCP | Port |
|-----|-------|------|---------|-------------|-----|------|
| **Utildex** | `/tools` | tool | 33 | all enabled | yes | 3000 |
| **Synedex** | `/games` | game | 2 (mental-math, sudoku) | all disabled | no | 3001 |
| **Simudex** | `/simulations` | simulation | 1 (minimal-debian-terminal) | all disabled | no | 3002 |

## Tech stack

Angular 21 (standalone components, signals), TypeScript 5.9 strict, Tailwind CSS v4, Vitest 4 (`@analogjs/vitest-angular`), esbuild (headless), D3.js, CodeMirror 6, CheerpX/WebVM (Simudex). Node ≥24. Docker multi-stage nginx. Cloudflare Pages.

## RepoLore knowledge map

If you work on... | Read this RepoLore node
--- | ---
Platform contracts, app catalog, module system, tool spaces, i18n core, plotting, GIF export, sandbox contracts | `_repolore/tree/src/core/core.md`
Multi-app architecture, fileReplacements, capability gating, storage namespacing | `_repolore/tree/src/apps/apps.md`
Build pipeline, scaffold CLI, validation checks, headless build, CheerpX rootfs | `_repolore/tree/scripts/scripts.md`
Service layer (data, modules, platform, UI) | `_repolore/tree/src/services/services.md`
Shared UI components (tool-layout, dashboard, terminal-platform, etc.) | `_repolore/tree/src/components/components.md`
Headless/MCP API (Node.js, esbuild bundle, packaging) | `_repolore/tree/src/headless/headless.md`
Internationalization (I18nText, 4 languages, integrity checks) | `_repolore/tree/src/i18n/i18n.md`
Route-level pages and routing | `_repolore/tree/src/pages/pages.md`
Test infrastructure (vitest configs, headless-dist/types) | `_repolore/tree/tests/tests.md`
Utildex specifically (33 tools, registries, MCP) | `_repolore/tree/src/apps/utildex/utildex.md`
Synedex specifically (2 games, design contracts) | `_repolore/tree/src/apps/synedex/synedex.md`
Simudex specifically (CheerpX terminal, Debian runtime) | `_repolore/tree/src/apps/simudex/simudex.md`

## Human documentation

`docs/platform/platform.md` — multi-app architecture, scaffolding, Simudex phases, Synedex design, tool spaces, GIF export, pretty plotting, processing loader. Some docs are mid-PR4 migration; check for transition notes.

## Key invariants

- **`src/core/app-catalog.ts` is the single source of truth** for app identity, capabilities, and paths. All `check:*` scripts validate against it. Any new app must be added here first.
- **Storage is namespaced per app**: `utildex-` / `synedex-` / `simudex-` prefixes, separate IndexedDB databases.
- **Modules follow kernel/contract/component pattern** with lazy loading (`import()`) everywhere. Every module has a pure-logic kernel, a metadata contract (`ModuleContract`), and an Angular UI component.
- **Shared code changes affect all three apps**: `src/core/`, `src/components/`, `src/services/` are shared. Use capability flags to gate app-specific behavior.
- **Headless bundle must not import Angular or browser APIs** — it is a separate esbuild bundle targeting Node.js only.

## Known uncertainty

- Module vocabulary migration (tools→modules) is in progress (PR3 of `docs/platform/multi-app/restructuring-plan.md`). Some code and docs still use "tool" terminology.
- Some `docs/platform/` references may use pre-PR4 paths — Synedex transition from `src/synedex-games/` to `src/apps/synedex/games/` is still settling.
- No RepoLore nodes exist for individual modules (33+ tools/games/simulations). Knowledge will be added organically as modules are modified.
