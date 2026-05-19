# Simudex Platform

Simudex is the skeleton for a future simulations library app in the shared multi-app repository. It has an independent Angular bundle boundary and runtime identity, but no simulation modules yet.

## Current Wiring

- App id: `simudex`
- App name: `Simudex`
- Route segment: `/simulations`
- Build output: `dist/simudex`
- Dev server port: `3002`
- Content root: `src/simudex-simulations/`
- SEO output: `src/seo/simudex/`

## Files

- Runtime config: `app.config.simudex.ts`
- Entry point: `index.simudex.tsx`
- HTML shell: `index.simudex.html`
- App shell: `src/app.component.simudex.ts` and `src/app.component.simudex.html`
- Routes: `src/app.routes.simudex.ts`
- Core registry: `src/core/core-registry.simudex.ts`
- Component registry: `src/core/tool-registry.simudex.ts`
- Space registry: `src/data/tool-space-registry.simudex.ts`
- Offline preload routes: `src/services/offline-route-loaders.simudex.ts`
- Manifest: `manifest.simudex.webmanifest`
- Service worker config: `ngsw-config.simudex.json`

## Commands

```bash
npm run dev:simudex
npm run build:simudex
npm run preview:simudex
npm run sitemap:simudex
```

The generic commands work too:

```bash
npm run dev:app -- --app=simudex
npm run build:app -- --app=simudex
```

## Adding The First Simulation

When the first simulation is added, create a module folder under `src/simudex-simulations/`, then wire its contract/kernel in `src/core/core-registry.simudex.ts` and its Angular component loader in `src/core/tool-registry.simudex.ts`. Keep the module id, folder name, route id, and registry key identical so the existing validation scripts can protect the boundary.
