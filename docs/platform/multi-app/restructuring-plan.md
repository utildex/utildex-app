# Multi-App Restructuring Plan

This document is the architecture contract for the multi-app restructuring work. It records the target model before any large filesystem moves so future PRs can be reviewed against a stable plan.

Done PR implementations must be accompanied in this file by a small note and a tick (`[x]`) to make progress explicit and reviewable.

## Target Model

The platform is organized around three concepts:

- **App**: a branded deployable surface such as Utildex, Synedex, or Simudex. An app owns runtime identity, routes, shell, SEO output, app manifest, service worker config, and app-specific content roots.
- **Module**: a runnable content unit inside an app. Tools, games, and simulations are module kinds. Future kinds should extend the module contract instead of adding a parallel registry model.
- **Platform**: shared infrastructure used by every app and module, including routing helpers, i18n, storage naming, host/list UI, registries, build scripts, checks, and developer tooling.

## Current Compatibility Layer

The current code still uses a few tool-centric route and file names. During the migration:

- `toolsRouteSegment` in `APP_CATALOG` is treated as the public module route segment.
- `ModuleContract`, `ModuleService`, `MODULE_REGISTRY_MAP`, and module component/core registry helpers are the shared abstractions.
- `ToolService`, `tool-host`, `all-tools`, and the app-specific `tool-registry.*.ts` filenames remain compatibility names around existing routes, files, and public APIs until later cleanup PRs can move or rename them safely.
- App content roots now declare a `kind` so the current filesystem can express whether a root contains `tool`, `game`, or `simulation` modules without moving files yet.

Compatibility names should not be expanded into new architecture. New generic infrastructure should use module vocabulary unless it is intentionally bridging existing code.

## MCP Compatibility Rule

MCP compatibility is currently limited to Utildex `tool` modules. For Utildex tools, omitted `mcp.compatible` defaults to `true`; setting `mcp.compatible: false` opts the tool out. For every other app or module kind, including games and simulations, MCP compatibility defaults to `false` and is resolved as `false` even if a contract accidentally sets `mcp.compatible: true`.

## Catalog Contract

`src/core/app-catalog.ts` is the source of truth for app identity and source layout. Every app entry must declare:

- stable app id, app name, route segment, hosting URL, GitHub URL, capabilities, build configuration, output path, and dev server port;
- root app files such as config, entry point, HTML, manifest, service worker config, shell component, route file, registries, and SEO directory;
- one or more content roots with `label`, `kind`, and `path`.

The catalog should remain explicit. Scripts may validate or consume it, but they should not keep their own hardcoded app lists.

## Module Contract Direction

Future module definitions should converge on a single manifest-like object that can load UI, metadata, and runtime logic:

```ts
type ModuleKind = 'tool' | 'game' | 'simulation';

interface ModuleDefinition {
  id: string;
  kind: ModuleKind;
  appId: AppId | 'shared';
  metadata: ModuleMetadata;
  loadComponent: () => Promise<Type<unknown>>;
  loadKernel?: () => Promise<Record<string, unknown>>;
}
```

The exact TypeScript shape can evolve in the module abstraction PR, but the design rule is stable: tools, games, and simulations are variations of modules, not separate platform primitives.

## PR Roadmap (Execution Checklist)

### [x] PR1 - Architecture Contract And Guardrails

Objective:

- Freeze the target app/module/platform model in docs before any large moves.
- Add module-kind vocabulary to app content roots in the app catalog.
- Add a dedicated architecture validation check to prevent catalog drift.
- Wire that check into prebuild validation so drift fails early.
- Keep this PR low-risk and non-disruptive: no module API rewrite and no filesystem move.

Done note:

- Implemented in `src/core/app-catalog.ts`, `scripts/check-app-architecture.ts`, `package.json`, `scripts/check-app-build-config.ts`, and multi-app platform docs.
- `prebuild:checks` now includes `check:app-architecture`.
- Full validation chain passed after the change (`prebuild:checks`), with only pre-existing lint warnings outside this PR scope.

### [x] PR2 - Maintainer Scaffolder CLI

Objective:

- Add a repository scaffolder command for module creation across apps (`tool`, `game`, `simulation`).
- Add app scaffolding support to bootstrap a new app variant from the same catalog contract.
- Provide dry-run mode that prints exactly which files will be created or modified.
- Provide deterministic output suitable for maintainers and AI agents.
- Add validation and rollback behavior so partial scaffolds do not leave inconsistent state.
- Update maintainer docs with command examples and expected workflow.

Done note:

- Implemented `scripts/scaffold.ts` with `create-module` and `create-app` commands, dry-run mode, JSON plan output, deterministic operation ordering, collision checks, and rollback on write failure.
- Added npm entry points: `scaffold`, `create:module`, and `create:app`.
- Documented maintainer and AI-agent usage in `docs/platform/multi-app/scaffolding.md` and linked it from platform docs.
- Smoke-tested module and app dry-runs through npm scripts and verified architecture/build config guardrails after the change.

### [x] PR3 - Module Abstraction

Objective:

- Introduce module-centric types and registry abstractions above current tool/game/simulation naming.
- Add compatibility adapters so existing tool-centric runtime paths keep working during migration.
- Migrate shared host/list/runtime code to consume module abstractions.
- Avoid filesystem moves in this PR to keep behavior changes isolated and reviewable.

Done note:

- Added module-facing contract and registry abstractions in `src/core/module-contract.ts`, `src/core/module-core-registry.ts`, and `src/core/module-registry.ts`.
- Replaced `ToolContract` usage with `ModuleContract` across module contracts, registries, scripts, tests, templates, and docs.
- Kept app-specific registry source files in their current paths for Angular file-replacement stability while switching their exported source maps to module vocabulary and adding optional `kind` metadata for future mixed-kind apps.
- Introduced `ModuleService` with `ToolService` as a compatibility export, plus module-named service aliases for new shared code.
- Migrated shared dynamic component loaders, offline preloading, and headless runtime lookup to the module registry/core registry facades.
- Updated scaffolder registry templates so new module entries include module kind metadata.
- Added module-aware MCP compatibility resolution so only Utildex tool modules can default to MCP-compatible.

### [x] PR4 - App-First Filesystem Migration

Objective:

- Move app-owned sources into app-scoped folders.
- Keep platform/shared runtime code separated from app-owned code.
- Preserve build output parity for existing apps while moving files.
- Use temporary shims/re-exports only where needed to keep migration incremental.

Done note:

- All app-owned entry/runtime/module roots now have canonical homes under `src/apps/<appId>/...`.
- `APP_CATALOG` source paths now point to canonical app-scoped locations for all current apps.
- Compatibility shims remain in place for incremental safety and are explicitly marked for PR6 cleanup.
- Validation gates (`prebuild:checks`, per-app builds, and `build:all`) pass after migration slices.

Execution principles:

- Keep PR4 scoped to filesystem and import-path migration only; do not combine with runtime behavior rewiring (PR5) or terminology cleanup (PR6).
- Migrate in deterministic slices with a green build between slices.
- Move one app at a time, with Utildex as pilot, then Synedex, then Simudex.
- Treat `src/core/app-catalog.ts` as the source of truth for every moved path.
- Prefer compatibility re-export shims over broad path rewrites when a move would otherwise force large unrelated edits.

Non-goals (deferred to later PRs):

- No removal of legacy compatibility names that are still needed by file replacement or public APIs.
- No script/runtime architecture rewiring beyond what is strictly required to resolve moved paths.
- No refactor of module contracts, registry semantics, or route semantics.

Layout decision record (PR4):

Two valid patterns were considered:

- Option A: Split roots (`apps/<appId>/` for app entry/build assets, `src/apps/<appId>/` for runtime source).
- Option B: Single root (`src/apps/<appId>/` for both runtime source and app entry/build assets).

Decision:

- Prefer Option B (single root) unless a concrete tooling constraint forces Option A.
- Rationale: it is easier to navigate, reduces path indirection, keeps app ownership visually unified, and lowers accidental drift between parallel trees.

Canonical target layout (Option B, post-PR6):

```text
src/
  apps/
    utildex/
      entry/                          # Bootstrap, app config, index.html, manifest, ngsw-config
      shell/                          # app.component.ts, app.component.html
      routing/                        # app.routes.ts
      seo/                            # robots.txt, sitemap.xml
      tools/                          # Module content root (kind: tool)
        base64-encoder-decoder/
        bmi-calculator/
        ... (33 tools)
      tool-spaces/                    # Tool-space contracts (developer, health, office)
      core-registry.ts                # CORE_REGISTRY → contract + kernel loaders
      module-registry.ts              # MODULE_COMPONENT_LOADERS → Angular component loaders
      tool-space-registry.ts          # Tool-space definitions
      article-registry.ts             # Article definitions
      offline-route-loaders.ts        # Offline preloading
      tour-steps.ts                   # DEFAULT_TOUR_STEPS (Utildex-specific)
      virtual-pets.types.ts           # Pet type definitions (gated by capabilities.virtualPets)
    synedex/
      entry/
      shell/
      routing/
      seo/
      games/                          # Module content root (kind: game)
        mental-math/
        sudoku/
      core-registry.synedex.ts
      module-registry.ts
      tool-space-registry.synedex.ts
      offline-route-loaders.synedex.ts
    simudex/
      entry/
      shell/
      routing/
      seo/
      simulations/                    # Module content root (kind: simulation)
        minimal-debian-terminal/
      core-registry.simudex.ts
      module-registry.ts
      tool-space-registry.simudex.ts
      offline-route-loaders.simudex.ts

  core/                               # Shared platform infrastructure
    app-catalog.ts                    # Source of truth for all app definitions
    app.config.ts                     # Runtime APP_CONFIG facade
    module-contract.ts                # ModuleContract type
    module-core-registry.ts           # Headless module registry abstraction
    module-registry.ts                # Angular module registry abstraction
    storage-keys.ts                   # App-prefixed storage key constants
    tour.config.ts                    # TOUR_STEPS InjectionToken (shared token only)
    tool-space.ts                     # ToolSpace types
    tool-space-resolver.ts            # Space resolution logic
    global-error-handler.ts
    i18n.ts, i18n-mapper.ts
    export/                           # Shared export utilities
    guards/                           # Route guards (language.guard.ts)
    pipes/                            # Shared pipes (local-link.pipe.ts)
    planner/                          # Module planner
    plotting/                         # Pretty-plotting engine
    sandbox/                          # CheerpX/WebVM sandbox infrastructure
    types/                            # Shared types (formats.ts, traits.ts, type-registry.ts, shared.ts, languages.ts)
    workers/                          # Web Workers (gif, simudex)

  services/                           # Organized into subdirectories in PR6
    data/                             # db, persistence, storage-manager, clipboard, tool-state
    platform/                         # app-config, app-update, font-loader, global-error, network, offline-manager, seo, shortcut
    ui/                               # guide, i18n, theme, toast, tour, virtual-pets
    modules/                          # module, tool-spaces, article, sandbox-*

  components/                         # Shared UI components (24 component dirs)
  pages/                              # Shared page components (16 page dirs)
  headless/                           # Headless Node.js API bundle
  directives/                         # Shared directives
  i18n/                               # Translation files (en, fr, es, zh)
  assets/                             # Static assets
  templates/                          # Scaffolder templates
  testing/                            # Test helpers
```

**Directories removed in PR6:** `src/seo/`, `src/data/`, `src/types/`

Layout rules:

- `src/apps/<appId>/` is the canonical home for all app-owned files.
- `src/apps/<appId>/entry/` contains app entry/build assets (config, entrypoint, html, manifest, ngsw).
- `src/apps/<appId>/shell/` and `src/apps/<appId>/routing/` are the canonical homes for every app's shell component and route manifest (normalized across all three apps in PR6).
- `src/core/` contains shared cross-app infrastructure only; app-specific registries must live under `src/apps/<appId>/`.
- `src/services/` is organized into `data/`, `platform/`, `ui/`, `modules/` subdirectories.
- No compatibility shims or passthrough re-exports remain anywhere in the codebase.

Documentation placement rule:

- Keep shared architecture docs in `docs/platform/`.
- Place app-owned docs in `docs/apps/<appId>/` (with optional `screenshots/` beside each app doc set).
- During migration, maintain redirects/links from existing app-specific platform pages to avoid broken review/bookmark paths.

Execution checklist:

1. Phase A - Baseline and move map

- [x] Snapshot current app source paths from `APP_CATALOG` and record old->new mapping in this PR description.
- [x] Run and capture baseline outputs for `npm run prebuild:checks` and `npm run build:all`.
- [x] Freeze naming decisions for app folder conventions before moving files.

2. Phase B - Create destination skeleton (no moves yet)

- [x] Create destination folder structure under `src/apps/` for all existing app ids.
- [x] Create destination app docs roots under `docs/apps/<appId>/` and add transitional links from current docs locations.
- [x] Update architecture checks (if needed) to allow new canonical path roots while preserving portability constraints.
- [x] Keep behavior identical; this phase should be structural only.

Progress note:

- `src/apps/utildex`, `src/apps/synedex`, and `src/apps/simudex` now exist as canonical app roots.
- App docs roots now exist at `docs/apps/utildex/`, `docs/apps/synedex/`, and `docs/apps/simudex/`.
- Legacy app pages under `docs/platform/synedex/README.md` and `docs/platform/simudex/README.md` now include transitional links to the new canonical docs roots.
- Architecture guardrails now verify canonical app roots under `src/apps/<appId>/` and canonical app docs roots at `docs/apps/<appId>/README.md`.

3. Phase C - Migrate app entry assets by app

- [x] Move Utildex root app files to `src/apps/utildex/entry/`, update catalog paths, and add minimal shims only if required by tooling.
- [x] Repeat for Synedex and Simudex with the same deterministic file order.
- [x] After each app batch, run full validation gates before starting the next app.

Progress note:

- Synedex and Simudex entry assets and wiring are now migrated to `src/apps/<appId>/entry/` and validated.

4. Phase D - Migrate runtime app-owned source by app

- [x] Move shell/routes/registries/offline loaders/seo and app module roots into `src/apps/<appId>/...`.
- [x] Keep legacy import surfaces as re-exports where broad path rewrites would increase risk.
- [x] Update only the imports required for compilation; avoid opportunistic refactors.

Progress note:

- Synedex and Simudex shell, routes, registries, offline loaders, and SEO roots are migrated to `src/apps/<appId>/...` and validated.
- Synedex and Simudex module roots are now migrated to `src/apps/synedex/games` and `src/apps/simudex/simulations`.
- Utildex core/module/tool-space/article registries, offline loaders, and SEO root are now canonicalized to `src/apps/utildex/...` with temporary compatibility shims at previous paths.
- Utildex shell and routes are now canonicalized to `src/apps/utildex/shell/` and `src/apps/utildex/routing/` with temporary root-level compatibility shims.
- Utildex module root is now canonicalized to `src/apps/utildex/tools` and the Utildex registries now import from that app-scoped path.

5. Phase E - Stabilize and document

- [x] Ensure every app `source.*` entry in `APP_CATALOG` points to the new location.
- [x] Add a short migration map in docs showing old and new canonical roots.
- [x] Mark compatibility shims with a clear PR6 cleanup note.

Migration map (current):

| Scope                 | Old root                                                                                                                                                                                | Current canonical root                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Synedex entry assets  | `index.synedex.tsx`, `index.synedex.html`, `app.config.synedex.ts`, `manifest.synedex.webmanifest`, `ngsw-config.synedex.json`                                                          | `src/apps/synedex/entry/`                                                                                                       |
| Simudex entry assets  | `index.simudex.tsx`, `index.simudex.html`, `app.config.simudex.ts`, `manifest.simudex.webmanifest`, `ngsw-config.simudex.json`                                                          | `src/apps/simudex/entry/`                                                                                                       |
| Synedex runtime roots | `src/synedex-games`, root-level Synedex app/runtime files                                                                                                                               | `src/apps/synedex/games` and `src/apps/synedex/...`                                                                             |
| Simudex runtime roots | `src/simudex-simulations`, root-level Simudex app/runtime files                                                                                                                         | `src/apps/simudex/simulations` and `src/apps/simudex/...`                                                                       |
| Utildex runtime roots | `src/core/core-registry.ts`, `src/core/tool-registry.ts`, `src/data/tool-space-registry.ts`, `src/services/offline-route-loaders.ts`, `src/data/article-registry.ts`, `src/seo/utildex` | `src/apps/utildex/{core-registry.ts,module-registry.ts,tool-space-registry.ts,offline-route-loaders.ts,article-registry.ts,seo/}` |
| Utildex shell/routes  | `src/app.component.ts`, `src/app.component.html`, `src/app.routes.ts`                                                                                                                   | `src/apps/utildex/shell/` and `src/apps/utildex/routing/`                                                                       |
| Utildex module root   | `src/utildex-tools`                                                                                                                                                                     | `src/apps/utildex/tools`                                                                                                        |

### PR6 Migration Map (additional moves)

| Scope                          | PR4/legacy location                                                                                          | PR6 canonical location                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Compatibility shims (delete)   | `src/app.component.ts`, `src/app.routes.ts`, `src/core/core-registry.ts`, `src/core/tool-registry.ts`, `src/data/tool-space-registry.ts`, `src/data/article-registry.ts` | *(deleted — consumers point directly to `src/apps/utildex/...`)* |
| Synedex shell/routing          | `src/apps/synedex/app.component.synedex.ts`, `src/apps/synedex/app.routes.synedex.ts`                        | `src/apps/synedex/shell/app.component.ts`, `src/apps/synedex/routing/app.routes.ts`                       |
| Simudex shell/routing          | `src/apps/simudex/app.component.simudex.ts`, `src/apps/simudex/app.routes.simudex.ts`                        | `src/apps/simudex/shell/app.component.ts`, `src/apps/simudex/routing/app.routes.ts`                       |
| Registry filenames             | `src/apps/*/tool-registry.ts` / `.synedex.ts` / `.simudex.ts`                                                | `src/apps/*/module-registry.ts`                                                                           |
| Service filename               | `src/services/tool.service.ts`                                                                               | `src/services/modules/module.service.ts`                                                                  |
| Dangling SEO dirs (delete)     | `src/seo/simudex/`, `src/seo/synedex/`                                                                       | *(deleted — canonical copies at `src/apps/<app>/seo/`)*                                                   |
| Utildex tool-spaces            | `src/data/tool-spaces/`                                                                                      | `src/apps/utildex/tool-spaces/`                                                                           |
| Shared types                   | `src/data/types.ts`, `src/data/languages.ts`                                                                 | `src/core/types/shared.ts`, `src/core/types/languages.ts`                                                 |
| Virtual pets types             | `src/data/virtual-pets.types.ts`                                                                             | `src/apps/utildex/virtual-pets.types.ts`                                                                  |
| TOUR_STEPS defaults            | `src/core/tour.config.ts` (DEFAULT_TOUR_STEPS)                                                               | `src/apps/utildex/tour-steps.ts`                                                                          |
| Services organization          | `src/services/*.ts` (flat 35 files)                                                                          | `src/services/{data,platform,ui,modules}/*.ts`                                                            |
| Empty dirs (delete)            | `src/types/`, `src/data/` (after moves)                                                                      | *(deleted)*                                                                                              |

Shim policy (temporary compatibility files):

- Shims are allowed only to preserve incremental compilation and reviewability.
- Shims must be one-purpose passthrough exports/imports; no side effects, no branching, no duplicated logic.
- Every shim should carry a short comment marker indicating PR6 cleanup ownership.
- New code should import canonical app-scoped paths when practical.

Validation gates (must pass at each phase boundary):

| Gate                        | Command                                                                     | Expected result                                           |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| Architecture and guardrails | `npm run prebuild:checks`                                                   | Passes with no new failures introduced by path migration  |
| Per-app build parity        | `npm run build:utildex` / `npm run build:synedex` / `npm run build:simudex` | All app builds succeed from moved paths                   |
| Aggregate parity            | `npm run build:all`                                                         | End-to-end parity preserved after migration               |
| Headless safety check       | `npm run test:headless` and `npm run test:headless:types`                   | No regressions in module registry/headless lookup surface |

Risk controls:

- Keep commits small and phase-aligned so rollback is commit-level, not manual file surgery.
- Avoid mixed concerns: if a change is not required for path migration, defer it.
- Prefer mechanical path updates and scripted rename operations over hand-edited broad refactors.
- Keep an explicit list of moved files to simplify review and audit.

Definition of done for PR4:

- All app-owned files have canonical homes under app-scoped folders.
- `APP_CATALOG` path metadata fully reflects the new layout.
- Existing apps produce equivalent successful builds through current commands.
- Temporary shims are minimal, documented, and explicitly scheduled for PR6 cleanup.
- Platform/shared folders contain only cross-app infrastructure.

### [x] PR5 - Build And Runtime Rewiring

Objective:

- Remove remaining hardcoded app assumptions in scripts and runtime wiring.
- Ensure app lifecycle commands and checks are driven by app catalog metadata.
- Validate sitemap/build/parity/integrity flows against the catalog-driven model.
- Ensure adding a new app requires minimal manual touch points.

Done note:

- App lifecycle checks and validation scripts are catalog-driven through `APP_IDS`/`APP_CATALOG` (`check-integrity`, `check-tool-ids`, `check-app-architecture`, `check-app-parity`, `check-app-build-config`, and sitemap generation).
- Aggregate build orchestration is now catalog-driven via `tsx scripts/run-app-command.ts build --all` (wired in `build:all`).
- `run-app-command` now enforces explicit argument contracts (`--app` vs `--all`) and avoids shell-based child process invocation for safer cross-platform execution.
- Validation gates remain green after rewiring (`prebuild:checks` and `build:all`).

### [x] PR6 - Legacy Cleanup & Architecture Normalization

Objective:

- Remove every PR4 compatibility shim so there is a single canonical path for every file.
- Normalize Synedex and Simudex app layouts to match the Utildex shell/routing convention.
- Clean up half-migrated and dangling directories left behind by PR4.
- Rename remaining tool-centric filenames to module-centric vocabulary.
- Fix cross-app storage key leaks introduced during the multi-app split.
- Resolve cross-app concerns around TOUR_STEPS, Docker parity, and services organization.

Done note:

- Phase A: Deleted 7 compatibility shims, updated all consumers to canonical paths.
- Phase B: Normalized Synedex/Simudex to `shell/` + `routing/` subdirectories matching Utildex.
- Phase C: Renamed all `tool-registry.*.ts` → `module-registry.ts`, `tool.service.ts` → `module.service.ts`, dropped `ToolService` alias. Updated angular.json file replacements and ~25 consumers.
- Phase D: Deleted `src/seo/`, moved `src/data/tool-spaces/` → `src/apps/utildex/tool-spaces/`, relocated `types.ts`/`languages.ts`/`virtual-pets.types.ts`/`articles/` to canonical homes. Removed empty `src/types/` and `src/data/`.
- Phase E: ClipboardService and article-reader leaks already resolved. Added storage key namespacing guard to `check-integrity.ts`.
- Phase F: Split `TOUR_STEPS` token from `DEFAULT_TOUR_STEPS`, added Simudex to `docker-compose.yml`, organized `src/services/` into `data/`, `platform/`, `ui/`, `modules/` subdirectories.
- Phase G: Updated migration map and canonical target layout. All validation gates pass: zero shims, zero stale dirs, zero TODO(PR6), all builds green, headless tests pass, Docker Compose defines three services.

---

#### Phase A — Remove Compatibility Shims

The following root-level files are pure passthrough re-exports pointing to `src/apps/utildex/...`. They must be **deleted** and every consumer import updated to the canonical path.

| Shim file | Canonical target | Consumers to update |
|-----------|-----------------|---------------------|
| `src/app.component.ts` | `src/apps/utildex/shell/app.component.ts` | Angular bootstrap in `src/apps/utildex/entry/index.tsx` |
| `src/app.routes.ts` | `src/apps/utildex/routing/app.routes.ts` | Any import of `./app.routes` (check scripts, tests) |
| `src/core/core-registry.ts` | `src/apps/utildex/core-registry.ts` | `src/core/module-core-registry.ts`, `src/headless/index.ts`, any test/spec files |
| `src/core/tool-registry.ts` | `src/apps/utildex/tool-registry.ts` | `src/core/module-registry.ts`, `src/services/tool.service.ts` |
| `src/data/tool-space-registry.ts` | `src/apps/utildex/tool-space-registry.ts` | `src/headless/index.ts`, `src/services/tool-spaces.service.ts` |
| `src/data/article-registry.ts` | `src/apps/utildex/article-registry.ts` | `src/services/article.service.ts`, route files that reference articles |

**Execution rules:**
- Delete each shim only after all consumers have been updated and the build passes.
- Run `npm run prebuild:checks` and `npm run build:all` after each shim removal to catch missed imports early.
- If a consumer outside `src/apps/utildex/` imports from a shim, evaluate whether that consumer should actually depend on Utildex-specific code (may indicate a cross-app leak).

**Post-phase validation:** `grep -r "TODO(PR6)" src/` should return zero results.

---

#### Phase B — Normalize App File Layouts

Synedex and Simudex currently use a flat `.synedex.ts` / `.simudex.ts` suffix convention for shell and routing files, while Utildex uses `shell/` and `routing/` subdirectories. Normalize all three apps to the subdirectory pattern.

**Synedex moves:**

| Current path | New path |
|-------------|----------|
| `src/apps/synedex/app.component.synedex.ts` | `src/apps/synedex/shell/app.component.ts` |
| `src/apps/synedex/app.component.synedex.html` | `src/apps/synedex/shell/app.component.html` |
| `src/apps/synedex/app.routes.synedex.ts` | `src/apps/synedex/routing/app.routes.ts` |

**Simudex moves:**

| Current path | New path |
|-------------|----------|
| `src/apps/simudex/app.component.simudex.ts` | `src/apps/simudex/shell/app.component.ts` |
| `src/apps/simudex/app.component.simudex.html` | `src/apps/simudex/shell/app.component.html` |
| `src/apps/simudex/app.routes.simudex.ts` | `src/apps/simudex/routing/app.routes.ts` |

**Catalog update:** Update `APP_CATALOG` entries for Synedex and Simudex so `source.appComponentFile`, `source.appComponentTemplateFile`, and `source.routesFile` point to the new canonical paths.

**Import updates:** Update the Synedex and Simudex entry points (`src/apps/*/entry/index.tsx`) to import from the new paths. Check all cross-references (scripts, tests, docs) for stale `.synedex.ts` / `.simudex.ts` path references.

---

#### Phase C — Rename Registry Files to Module Vocabulary

The app-specific `tool-registry.*.ts` files still carry the old "tool" name. Rename them to `module-registry.*.ts` and update all imports. The exported symbol `ModuleRegistrySourceEntry` and internal `MODULE_COMPONENT_LOADERS` map are already module-named; only the filename is stale.

| Current path | New path |
|-------------|----------|
| `src/apps/utildex/tool-registry.ts` | `src/apps/utildex/module-registry.ts` |
| `src/apps/synedex/tool-registry.synedex.ts` | `src/apps/synedex/module-registry.ts` |
| `src/apps/simudex/tool-registry.simudex.ts` | `src/apps/simudex/module-registry.ts` |

**Catalog update:** Update `APP_CATALOG` entries: `source.moduleRegistryFile` for all three apps.

**Import updates:**
- `src/core/module-registry.ts` imports from `./tool-registry` → update to `../apps/utildex/module-registry`
- `src/core/tool-registry.ts` shim (deleted in Phase A) — no action needed
- Any script, test, or doc referencing the old filename

**Service rename:** Rename `src/services/tool.service.ts` → `src/services/module.service.ts`. This file already exports `ModuleService` with `ToolService` as a compatibility alias. After the rename, drop the `ToolService` alias. The `src/services/module.service.ts` re-export shim can then be deleted.

---

#### Phase D — Clean Up Dangling & Half-Migrated Directories

**D.1 — Remove duplicate `src/seo/` entries**

`src/seo/simudex/` and `src/seo/synedex/` are pre-PR4 copies. Canonical SEO files now live at `src/apps/<app>/seo/`. Delete the `src/seo/` directory entirely.

**D.2 — Move Utildex-specific tool-spaces out of `src/data/`**

The three tool-space contracts under `src/data/tool-spaces/` (developer, health, office) are Utildex-only. Move them to `src/apps/utildex/tool-spaces/`. Update imports in `src/apps/utildex/tool-space-registry.ts` and the headless resolver.

**D.3 — Relocate remaining shared types from `src/data/`**

After moving tool-spaces, `src/data/` still contains genuinely shared files:

| File | Disposition |
|------|-------------|
| `src/data/types.ts` | Move to `src/core/types/shared.ts` (core types: `I18nText`, `ToolMetadata`, `WidgetCapability`, `WidgetLayout`, `WidgetPreset`) |
| `src/data/languages.ts` | Move to `src/core/types/languages.ts` |
| `src/data/virtual-pets.types.ts` | Move to `src/apps/utildex/virtual-pets.types.ts` (Utildex-only, gated by `capabilities.virtualPets`) |

Delete `src/data/` directory once empty.

**D.4 — Remove empty `src/types/`**

This directory contains no files. Delete it.

**Post-phase validation:** `src/data/`, `src/types/`, and `src/seo/` should no longer exist.

---

#### Phase E — Fix Cross-App Storage Key Leaks

These are bugs where shared services hardcode `'utildex-*'` storage keys, violating the app-prefixed `STORAGE_KEYS` namespacing strategy.

**E.1 — ClipboardService (`src/services/clipboard.service.ts`)**

Currently hardcodes `'utildex-clipboard-history'` in its `load`/`save`/`clear` calls (documented in repo memory as using hardcoded keys despite `STORAGE_KEYS.CLIPBOARD_HISTORY` being available). Change to use `STORAGE_KEYS.CLIPBOARD_HISTORY` which is already app-prefixed via `storage-keys.ts`.

**E.2 — Article Reader (`src/pages/article-reader/article-reader.component.ts`)**

Currently hardcodes `'utildex-reader-size'` and `'utildex-reader-font'` localStorage keys (lines 379, 382, 386–387). Replace with keys built from `STORAGE_KEYS.PREFIX_APP` (or a new dedicated key in `storage-keys.ts`). Since the articles page is included in Synedex routes, this leak causes font/size preferences to bleed between apps.

**E.3 — Add ESLint guard rule**

Add a custom ESLint rule (or `no-restricted-syntax` configuration) in `eslint.config.js` that flags string literals matching `/^utildex-[a-z]/` outside of `src/apps/utildex/` and `src/core/storage-keys.ts`. This prevents future hardcoded app-specific key leaks.

---

#### Phase F — Resolve Cross-App Concerns

**F.1 — Extract TOUR_STEPS token from Utildex-specific defaults**

`src/core/tour.config.ts` currently co-locates the `TOUR_STEPS` InjectionToken with `DEFAULT_TOUR_STEPS` (which contain Utildex-only routes like `/tools`, `/my-dashboard`). While Synedex and Simudex already override the token with `useValue: []` at bootstrap, they still import from a file that defines Utildex-specific data.

Split into:
- `src/core/tour.config.ts` — keep `TOUR_STEPS` InjectionToken only (shared)
- `src/apps/utildex/tour-steps.ts` — move `DEFAULT_TOUR_STEPS` here (Utildex-specific)

Update Utildex entry point to import `DEFAULT_TOUR_STEPS` from the new app-scoped path. Synedex/Simudex entry points continue importing `TOUR_STEPS` from the shared location (unchanged).

**F.2 — Add Simudex service to docker-compose.yml**

`docker-compose.yml` currently defines `utildex` and `synedex` services but no `simudex`. Add a `simudex` service following the same pattern, with a distinct port default (e.g. `SIMUDEX_PORT:-9528`). The Dockerfile already supports `APP_BUILD` as a build arg, so no Dockerfile changes are needed.

**F.3 — Organize `src/services/` into subdirectories**

The flat 35-file `src/services/` directory makes it hard to reason about service boundaries. Group into:

```
src/services/
  data/           # Data persistence and state
    db.service.ts
    persistence.service.ts
    storage-manager.service.ts
    clipboard.service.ts
    tool-state.ts
  platform/       # App lifecycle and infrastructure
    app-config.service.ts
    app-update.service.ts
    font-loader.service.ts
    global-error.service.ts
    network.service.ts
    offline-manager.service.ts
    offline-route-loaders.ts
    seo.service.ts
    shortcut.service.ts
  ui/             # User-facing services
    guide.service.ts
    i18n.service.ts
    theme.service.ts
    toast.service.ts
    tour.service.ts
    virtual-pets.service.ts
  modules/        # Module/tool/game/simulation services
    module.service.ts       (renamed from tool.service.ts in Phase C)
    tool-spaces.service.ts
    article.service.ts
    sandbox-plugin-manager.service.ts
    sandbox-terminal-session.service.ts
```

This is a pure file move with import-path updates. No logic changes. Spec files move alongside their implementations.

---

#### Phase G — Documentation & Final Validation

**G.1 — Update migration map**

Add PR6 moves to the migration map table in this document.

**G.2 — Update canonical target layout**

The target layout earlier in this document shows `registries/` and `modules/` subdirectories. After PR6 the actual layout is:
- `shell/` (app component)
- `routing/` (routes)
- `entry/` (bootstrap, config, HTML, manifest, ngsw)
- `seo/` (robots.txt, sitemap.xml)
- Registry files at app root (`core-registry.ts`, `module-registry.ts`, `tool-space-registry.ts`, `article-registry.ts`, `offline-route-loaders.ts`) — these can optionally move into a `registries/` subdirectory if desired, but that is deferred to a future PR to avoid scope creep.
- Module content roots: `tools/` (Utildex), `games/` (Synedex), `simulations/` (Simudex)

Update the canonical target layout tree to reflect reality.

**G.3 — Validation gates**

| Gate | Command | Expected result |
|------|---------|-----------------|
| Architecture checks | `npm run prebuild:checks` | Passes with zero shim references, zero stale paths |
| All app builds | `npm run build:all` | All three apps build from canonical paths only |
| Headless safety | `npm run test:headless && npm run test:headless:types` | Headless registry resolution unchanged |
| No TODO(PR6) remaining | `grep -r "TODO(PR6)" src/` | Zero results |
| No stale directories | Check existence of `src/seo/`, `src/data/`, `src/types/` | None exist |
| Docker compose | `docker compose config` | Three services defined, no config errors |

**G.4 — Definition of done for PR6**

- Zero compatibility shims remain in the codebase.
- All three apps use `shell/` and `routing/` subdirectories.
- All registry filenames use module vocabulary (`module-registry.ts`).
- `src/data/`, `src/types/`, and `src/seo/` directories no longer exist.
- No hardcoded `'utildex-*'` storage keys exist outside `src/apps/utildex/` and `src/core/storage-keys.ts`.
- ESLint rule prevents future cross-app storage key leaks.
- TOUR_STEPS token is separated from Utildex-specific tour data.
- Docker Compose defines all three app services.
- `src/services/` is organized into `data/`, `platform/`, `ui/`, `modules/` subdirectories.
- All validation gates pass.

---

## Guardrails

The prebuild chain runs architecture checks before app parity and Angular build config checks. The architecture check verifies:

- `DEFAULT_APP_ID` belongs to the catalog;
- catalog keys match app ids;
- app ids, build configurations, output paths, dev server ports, and content root paths remain unique;
- app names are non-empty and catalog URLs are valid HTTP(S) URLs;
- source paths are portable relative paths;
- output and SEO paths stay under expected roots;
- article capability and article registry declarations agree;
- every content root declares a known module kind.

These checks are intentionally conservative. They protect the restructuring sequence without forcing the final folder layout before the migration PRs are ready.

## Review Rules

- Do not combine large file moves with platform abstraction changes.
- Keep compatibility adapters until all apps build through the module-centric path.
- Prefer catalog-driven scripts over app-name branches.
- Shared feature visibility should use capabilities, not app identity, unless branding or routing truly depends on a specific app.
- Any new module kind must update the catalog type, scaffolder templates, validation checks, and docs in the same PR.
