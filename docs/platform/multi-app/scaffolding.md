# Maintainer Scaffolding

The repository scaffolder creates app and module boilerplate from the current app catalog contract. It is intended for maintainers, contributors, and AI agents that need deterministic file plans before writing changes.

Always start with `--dry-run`. Use `--json` when an agent or script needs to parse the plan.

## Commands

```bash
npm run create:module -- --app=synedex --kind=game --id=memory-grid --dry-run
npm run create:module -- --app=simudex --kind=simulation --id=particle-lab --dry-run --json

npm run create:app -- --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run
npm run create:app -- --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run --json
```

The generic entry point is also available:

```bash
npm run scaffold -- create-module --app=utildex --id=color-palette --dry-run
npm run scaffold -- create-app --id=physidex --name=Physidex --kind=simulation --route=experiments --dry-run
```

Interactive wizard mode is also available when you want guided prompts:

```bash
npm run scaffold -- --interactive
```

If you run `npm run scaffold` with no command in a TTY terminal, it also opens the interactive menu.

## Create Module

`create-module` scaffolds into the current catalog-declared content root for the target app and kind. In the current layout, that means:

- `tool` modules for Utildex go under `src/utildex-tools/`.
- `game` modules for Synedex go under `src/synedex-games/`.
- `simulation` modules for Simudex go under `src/simudex-simulations/`.

Required options:

- `--app=<appId>`: existing app id from `APP_CATALOG`.
- `--id=<module-id>`: lowercase kebab-case module id.

Optional options:

- `--kind=tool|game|simulation`: defaults to the app's first catalog content root kind.
- `--name="Display Name"`: defaults to title-casing the id.
- `--description="..."`: defaults to a starter description.
- `--category="Category"`: defaults to `Utility`, `Cognition`, or `Simulation` based on kind.
- `--icon=<material-symbol>`: defaults by kind.
- `--color=<hex>`: defaults to `#2563eb`.
- `--tags="one,two"`: defaults to starter tags.

Planned output includes component, template, styles, kernel, contract, runtime i18n, contract i18n, barrel export, and registry updates for the app's core/component registries.

## Create App

`create-app` bootstraps a new app variant using the current multi-app bundle boundary. It creates app files and updates the shared coordination files needed by the current Angular setup.

Required options:

- `--id=<app-id>`: lowercase kebab-case app id.
- `--name="App Name"`: display name.
- `--kind=tool|game|simulation`: module kind for the app's first content root.
- `--route=<route-segment>`: public module route segment.

Optional options:

- `--port=<number>`: dev server port, defaults to the next catalog port.
- `--base-url=<url>`: defaults to `https://<app-id>.example.com`.
- `--github-url=<url>`: defaults to the repository URL used by existing non-default apps.
- `--description="..."`: used in index HTML, manifest, and welcome page.
- `--theme-color=<hex>` and `--background-color=<hex>`: used in generated web assets.
- `--content-root=<path>`: defaults to `src/<app-id>-<kind-plural>`.

Planned output includes app config, bootstrap entry, index HTML, manifest, service worker config, shell component/template, route manifest, welcome page, empty registries, offline route loaders, module root placeholder, SEO placeholder, and updates to `APP_CATALOG`, `angular.json`, `package.json`, and `tsconfig.json`.

## Safety Rules

- Existing files are never overwritten.
- Registry updates fail if the target module id already exists.
- App creation fails if the app id is already declared.
- Write mode uses rollback: if any file operation fails, previously written files are restored or removed.
- JSON output omits generated file contents intentionally, so agents can inspect the plan without moving large templates through chat.

After applying a scaffold, run:

```bash
npm run prebuild:checks
```

For a newly scaffolded app, also run its build once it has at least the generated baseline committed:

```bash
npm run build:app -- --app=<app-id>
```
