import type { SandboxArtifact } from './sandbox-artifact';
import { getSimudexDebianResource } from './runtime-resources';

/**
 * Artifact descriptor for the Debian rootfs used by the Minimal Debian Terminal.
 * Pass this to ArtifactCacheService for download, caching, and stats queries.
 */
export const DEBIAN_ROOTFS_ARTIFACT: SandboxArtifact = {
  id: 'simudex/debian/rootfs',
  name: 'Debian Operating System',
  sandbox: 'simudex',
  runtime: 'debian',
  manifestUrl: getSimudexDebianResource('rootfsManifest'),
};
