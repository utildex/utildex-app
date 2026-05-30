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

### [ ] PR4 - App-First Filesystem Migration

Objective:

- Move app-owned sources into app-scoped folders.
- Keep platform/shared runtime code separated from app-owned code.
- Preserve build output parity for existing apps while moving files.
- Use temporary shims/re-exports only where needed to keep migration incremental.

### [ ] PR5 - Build And Runtime Rewiring

Objective:

- Remove remaining hardcoded app assumptions in scripts and runtime wiring.
- Ensure app lifecycle commands and checks are driven by app catalog metadata.
- Validate sitemap/build/parity/integrity flows against the catalog-driven model.
- Ensure adding a new app requires minimal manual touch points.

### [ ] PR6 - Legacy Cleanup

Objective:

- Remove compatibility aliases that are no longer needed after module migration.
- Rename remaining tool-centric internals that no longer represent platform semantics.
- Clean obsolete files and migration shims.
- Finalize docs so architecture and terminology are consistent end-to-end.

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
