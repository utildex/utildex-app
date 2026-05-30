// PR4 compatibility shim. Canonical Utildex registry lives under src/apps/utildex.
// TODO(PR6): remove this shim after all consumers import the canonical path.
export * from '../apps/utildex/tool-registry';
