# Multi-App Repository

This repository is organized as one shared Angular platform that can produce multiple independent applications. Utildex and Synedex are the current applications, but the structure is intended to scale to additional apps without turning every script and shared component into a new app-name branch.

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
- `npm run check:app-build-config` checks that `angular.json` and package scripts match the catalog.
- `npm run check:tool-ids` and `npm run check:integrity` discover app content roots from the catalog.
- `npm run sitemap:all` generates SEO output for every catalog app.
- `npm run generate:mcp-manifest` generates MCP discovery artifacts for the single catalog app with `capabilities.mcp: true`. If more than one app enables MCP, pass `--app=<appId>`.

## Adding A New App

To add a new app, use this flow:

1. Pick a stable app id, for example `simudex`.
2. Add a new `APP_CATALOG` entry in `src/core/app-catalog.ts`.
3. Create the runtime config file, for example `app.config.simudex.ts`, with the same identity and capabilities declared in the catalog.
4. Create the app entry point and HTML file, for example `index.simudex.tsx` and `index.simudex.html`.
5. Create the app shell and routes, for example `src/app.component.simudex.ts`, `src/app.component.simudex.html`, and `src/app.routes.simudex.ts`.
6. Create app-specific registry files for core loaders, component loaders, spaces, and offline route loaders.
7. Create the app content root, for example `src/simudex-simulations/`.
8. Add the Angular build and serve configuration in `angular.json`, including file replacements and SEO assets.
9. Add manifest and service worker config files.
10. Run the validation commands listed above.

After that, the generic commands work for the new app id. Existing named convenience scripts are optional; Docker already builds through `build:app -- --app=<id>`.

## What Still Remains Manual

`angular.json` is still manually edited. The catalog now validates Angular config drift, but it does not generate Angular config. That keeps the architecture explicit while removing the most fragile duplicated app lists from scripts and shared runtime code.
