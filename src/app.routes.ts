// PR4 compatibility shim. Canonical Utildex routes live under src/apps/utildex/routing.
// TODO(PR6): remove this shim after all consumers import the canonical path.
export * from './apps/utildex/routing/app.routes';
