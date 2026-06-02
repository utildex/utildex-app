// PR4 compatibility shim. Canonical Utildex loader list lives under src/apps/utildex.
// TODO(PR6): remove this shim after all consumers import the canonical path.
export * from '../apps/utildex/offline-route-loaders';
