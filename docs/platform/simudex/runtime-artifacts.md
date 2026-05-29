# Simudex Runtime Artifacts

Heavy sandbox images are generated locally in `sandbox-images/` and published to Cloudflare R2. They must not be committed to the repository or copied into `src/assets`.

## Repository Flow

1. Build the Debian root filesystem with `npm run build:simudex-rootfs`.
2. Prepare the publish manifest with `npm run prepare:r2-artifact -- --version <version>`.
3. Publish from GitHub Actions using the `Publish Sandbox Runtime Artifact` workflow.

The workflow writes immutable objects under this shape:

```text
sandboxes/simudex/debian/rootfs/<version>/rootfs.ext2
sandboxes/simudex/debian/rootfs/<version>/rootfs.meta.json
sandboxes/simudex/debian/rootfs/<version>/manifest.json
sandboxes/simudex/debian/rootfs/latest.json
```

Only `latest.json` is mutable. The rootfs object and versioned manifest are immutable, cacheable artifacts.

## R2 Requirements

- Bucket name: `simudex-runtime-artifacts`; store it in the GitHub environment secret `R2_BUCKET`.
- Public reads must be served over HTTPS from `https://runtime.simudex.org` unless `src/core/runtime-resources.ts` is changed.
- Browser reads must support `GET`, `HEAD`, byte ranges, and CORS from the Simudex origin.
- Expose `Accept-Ranges`, `Content-Length`, `Content-Range`, and `ETag` headers.
- Writes must happen only through the GitHub Actions environment `r2-artifacts-production`.

## Local Runs

Local runs can build the image and prepare the manifest without GitHub secrets:

```bash
npm run build:simudex-rootfs
npm run prepare:r2-artifact -- --version <version>
```

GitHub secrets are only available inside GitHub Actions. If a maintainer needs to test an upload locally, export equivalent local environment variables (`CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`) in their shell or a local-only env file, then use the same R2/S3 endpoint manually. Do not commit local secret files.
