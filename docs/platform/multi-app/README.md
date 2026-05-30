# Multi-App Repository

This repository is organized as one shared Angular platform that can produce multiple independent applications. Utildex, Synedex, and Simudex are the current applications, but the structure is intended to scale to additional apps without turning every script and shared component into a new app-name branch.

For the current restructuring direction, see [Multi-App Restructuring Plan](restructuring-plan.md).
For maintainer tooling, see [Maintainer Scaffolding](scaffolding.md).

## Architecture

The app catalog is the source of truth for app identity and build wiring:

- `src/core/app-catalog.ts` declares every app id.
- Root app config files such as `app.config.ts` and `app.config.synedex.ts` provide runtime identity for the app bundle.
- Angular `fileReplacements` keep bundles independent at compile time.
- Scripts read the catalog instead of maintaining their own app lists.

The default app, Utildex, uses the canonical file names. Non-default apps use replacement files declared in both the catalog and `angular.json`.

## App Catalog Fields

Each app entry declares:

- `appId`, `appName`, `toolsRouteSegment`, `hosting`, and `githubUrl`.
- `capabilities`, which shared runtime UI uses to decide whether features such as articles, dashboard, storage history, tour, virtual pets, file blobs, spaces, headless, or MCP are available.
- `buildConfiguration`, `outputPath`, and `devServerPort`.
- `source`, including root config, entry point, HTML, manifest, service worker config, route file, shell component, registries, content roots, and SEO output directory.
- `source.contentRoots`, where each root declares a `label`, a `kind` (`tool`, `game`, or `simulation`), and a `path`.

`toolsRouteSegment` is a legacy field name during the module migration. Treat it as the app's public module route segment until the module-centric rename lands.

## Runtime Rules

- Shared Angular code should use `APP_CONFIG` or `AppConfigService`, not raw app-name literals.
- Shared feature visibility should use `APP_CONFIG.capabilities` or `appConfig.capabilities`.
- Storage keys must come from `STORAGE_KEYS`, `getPrefKey()`, or `STORAGE_KEYS.PREFIX_APP`.
- App-specific structural differences should use app-specific route, shell, registry, or loader files.
- Do not add new `if appId === 'some-app'` checks in shared code unless the branch is truly app identity logic and not a feature/capability decision.

## Build And Validation

Generic commands are app-aware:

```bash
npm run build:app -- --app=utildex
npm run dev:app -- --app=synedex
npm run preview:app -- --app=synedex
npm run sitemap:app -- --app=utildex
npm run sitemap:all
```

Validation guardrails:

- `npm run check:app-parity` checks registry parity, catalog file presence, and runtime config identity/capability parity.
- `npm run check:app-architecture` checks app catalog uniqueness, portable paths, content root module kinds, and capability/source consistency.
- `npm run check:app-build-config` checks that `angular.json` and package scripts match the catalog.
- `npm run check:tool-ids` and `npm run check:integrity` discover app content roots from the catalog.
- `npm run sitemap:all` generates SEO output for every catalog app.
- `npm run generate:mcp-manifest` generates MCP discovery artifacts for the single catalog app with `capabilities.mcp: true`. If more than one app enables MCP, pass `--app=<appId>`.

MCP compatibility is currently intentionally narrow: only Utildex `tool` modules can be MCP-compatible. For Utildex tools, omitted `mcp.compatible` defaults to `true` and `mcp.compatible: false` opts the tool out. For every other module kind or app, including Synedex games and Simudex simulations, MCP compatibility defaults to `false` and is treated as `false` even if a contract accidentally sets `mcp.compatible: true`.

## Adding A New App

To add a new app, use this flow:

Prefer the scaffolder for the initial file plan:

```bash
npm run create:app -- --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run
```

1. Pick a stable app id, for example `physidex`.
2. Add a new `APP_CATALOG` entry in `src/core/app-catalog.ts`.
3. Create the runtime config file, for example `app.config.physidex.ts`, with the same identity and capabilities declared in the catalog.
4. Create the app entry point and HTML file, for example `index.physidex.tsx` and `index.physidex.html`.
5. Create the app shell and routes, for example `src/app.component.physidex.ts`, `src/app.component.physidex.html`, and `src/app.routes.physidex.ts`.
6. Create app-specific registry files for core loaders, component loaders, spaces, and offline route loaders.
7. Create the app content root, for example `src/physidex-simulations/`, and declare its module kind in the catalog.
8. Add the Angular build and serve configuration in `angular.json`, including file replacements and SEO assets.
9. Add manifest and service worker config files.
10. Run the validation commands listed above.

After that, the generic commands work for the new app id. Existing named convenience scripts are optional; Docker already builds through `build:app -- --app=<id>`.

## What Still Remains Manual

`angular.json` is still manually edited. The catalog now validates Angular config drift, but it does not generate Angular config. That keeps the architecture explicit while removing the most fragile duplicated app lists from scripts and shared runtime code.
