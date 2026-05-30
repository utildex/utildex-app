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

Canonical target layout (Option B):

```text
src/apps/
  utildex/
    entry/
      app.config.ts
      index.tsx
      index.html
      manifest.webmanifest
      ngsw-config.json
    shell/
    routing/
    registries/
    seo/
    modules/
  synedex/
    entry/
      app.config.ts
      index.tsx
      index.html
      manifest.webmanifest
      ngsw-config.json
    shell/
    routing/
    registries/
    seo/
    modules/
  simudex/
    entry/
      app.config.ts
      index.tsx
      index.html
      manifest.webmanifest
      ngsw-config.json
    shell/
    routing/
    registries/
    seo/
    modules/

src/platform/
  ...shared cross-app infrastructure only...
```

Layout rules:

- `src/apps/<appId>/` is the canonical home for all app-owned files.
- `src/apps/<appId>/entry/` contains app entry/build assets (config, entrypoint, html, manifest, ngsw).
- `src/platform/` is reserved for shared app-agnostic code; app-specific files must not be added there.
- Existing compatibility filenames may remain as shims if required, but shims should not contain business logic.

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
- [ ] Create destination folder structure under `src/apps/` for all existing app ids.
- [ ] Create destination app docs roots under `docs/apps/<appId>/` and add transitional links from current docs locations.
- [ ] Update architecture checks (if needed) to allow new canonical path roots while preserving portability constraints.
- [ ] Keep behavior identical; this phase should be structural only.

3. Phase C - Migrate app entry assets by app
- [x] Move Utildex root app files to `src/apps/utildex/entry/`, update catalog paths, and add minimal shims only if required by tooling.
- [x] Repeat for Synedex and Simudex with the same deterministic file order.
- [x] After each app batch, run full validation gates before starting the next app.

Progress note:

- Synedex and Simudex entry assets and wiring are now migrated to `src/apps/<appId>/entry/` and validated.

4. Phase D - Migrate runtime app-owned source by app
- [ ] Move shell/routes/registries/offline loaders/seo and app module roots into `src/apps/<appId>/...`.
- [ ] Keep legacy import surfaces as re-exports where broad path rewrites would increase risk.
- [ ] Update only the imports required for compilation; avoid opportunistic refactors.

Progress note:

- Synedex and Simudex shell, routes, registries, offline loaders, and SEO roots are migrated to `src/apps/<appId>/...` and validated.
- App module roots remain in place (`src/synedex-games`, `src/simudex-simulations`) for a dedicated follow-up slice.

5. Phase E - Stabilize and document
- [ ] Ensure every app `source.*` entry in `APP_CATALOG` points to the new location.
- [ ] Add a short migration map in docs showing old and new canonical roots.
- [ ] Mark compatibility shims with a clear PR6 cleanup note.

Shim policy (temporary compatibility files):

- Shims are allowed only to preserve incremental compilation and reviewability.
- Shims must be one-purpose passthrough exports/imports; no side effects, no branching, no duplicated logic.
- Every shim should carry a short comment marker indicating PR6 cleanup ownership.
- New code should import canonical app-scoped paths when practical.

Validation gates (must pass at each phase boundary):

| Gate | Command | Expected result |
| --- | --- | --- |
| Architecture and guardrails | `npm run prebuild:checks` | Passes with no new failures introduced by path migration |
| Per-app build parity | `npm run build:utildex` / `npm run build:synedex` / `npm run build:simudex` | All app builds succeed from moved paths |
| Aggregate parity | `npm run build:all` | End-to-end parity preserved after migration |
| Headless safety check | `npm run test:headless` and `npm run test:headless:types` | No regressions in module registry/headless lookup surface |

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
