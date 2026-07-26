# scripts/ — Build Pipeline & Scaffold CLI

The operational tooling layer. Builds, validates, scaffolds, and deploys all three apps.

## Build dispatcher

`run-app-command.ts` — thin wrapper that parses `--app=<id>` (or `--all`) and shells out to `@angular/build:application` via the Angular CLI. Supports `build`, `serve`, and `preview` commands. Resolves the `ng` binary from `node_modules/`. Passes through `--` args.

```bash
npm run dev:utildex     # → tsx scripts/run-app-command.ts serve --app=utildex
npm run build:all       # → tsx scripts/run-app-command.ts build --all
```

## Scaffold CLI (`scaffold/`)

Generates boilerplate for modules and apps. Entry: `scripts/scaffold.ts` → `scripts/scaffold/main.ts`.

### Commands

```bash
# Create a new module
npm run create:module -- --app=utildex --id=my-tool --kind=tool --name="My Tool"

# Create a new app
npm run create:app -- --id=myapp --name="My App" --kind=tool --route=tools --port=3003

# Interactive wizard
npm run scaffold -- --interactive
```

### Key files in `scaffold/`

| File | Role |
|------|------|
| `cli.ts` | Argument parser — `--dry-run`, `--json`, `--interactive`, command dispatch |
| `types.ts` | Data model — `ScaffoldPlan`, `PlanOperation`, module/app options |
| `app-plan.ts` | Generates full app scaffold plan (catalog entry, shell, routes, registries, manifest, NGSW) |
| `module-plan.ts` | Generates module scaffold plan (contract, kernel, component, i18n, CSS) + edits parent registries |
| `fs-plan.ts` | Applies plan to disk — creates/updates files, validates no conflicts, supports rollback |
| `source-edit.ts` | `insertObjectEntry()` — programmatically inserts new key/value into TypeScript object literals |
| `module-templates.ts` | Template generators for module files |
| `app-templates/` | Template generators for app files |

### Safety features
- `--dry-run` prints the plan without writing files
- Collision detection before any file write
- Rollback on failure (removes created files)
- `--json` outputs the plan for CI/tooling consumption

## Validation pipeline

`npm run prebuild:checks` runs these sequentially (any failure stops the pipeline):

| Order | Script | What it validates |
|-------|--------|-------------------|
| 1 | `check-app-architecture.ts` | Catalog entries: kebab-case IDs, valid module kinds, portable paths, unique content roots |
| 2 | `check-app-build-config.ts` | `angular.json` matches catalog: output paths, service worker, assets, fileReplacements |
| 3 | `check-app-parity.ts` | Registry 1:1 key parity (core ↔ module loaders), all declared source files exist |
| 4 | `check-tool-ids.ts` | Directory name matches contract `id` field for every module |
| 5 | `check-integrity.ts` | i18n completeness (all 4 languages, identical keys), route registry matches page components |

Then: format check → lint → sitemap generation → MCP manifest generation.

## Specialized scripts

| Script | Purpose |
|--------|---------|
| `generate-mcp-manifest.ts` | Scans MCP-compatible modules, generates paginated `tools-*.json` + `spaces-*.json` into `src/assets/mcp/` |
| `generate-sitemap.ts` | Builds `sitemap.xml` per app with i18n alternates |
| `build-cheerpx-rootfs.ts` | Docker-based Debian i386 rootfs build for Simudex (bash, coreutils, git, python3, curl, etc.) |
| `sync-cheerpx-runtime.ts` | Copies CheerpX JS/WASM from `node_modules/@leaguetech/cheerpx` → `src/assets/simudex/debian/cheerpx/root/` |
| `prepare-r2-artifact.ts` | SHA-256 checksums + manifest JSON for Cloudflare R2 Debian image deployment |
| `write-headless-types-entry.ts` | Barrel file at `dist-headless/types/headless/index.d.ts` for consumer type resolution |

## Related

- → Read: `docs/platform/multi-app/scaffolding.md` for human-oriented scaffold guide
- → Read: `docs/platform/simudex/runtime-artifacts.md` for CheerpX build/publish flow
- → Read: `_repolore/tree/src/core/core.md` for the catalog contracts these scripts validate against
- → Read: `_repolore/tree/src/apps/apps.md` for build configs and fileReplacements

