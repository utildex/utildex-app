# Changelog

## [Unreleased]

### Added
- Multi-app restructuring (PR1-PR4): migrated to `src/apps/` layout with `APP_CATALOG`, module contracts, and capability gating.
- Simudex app: sandboxed Linux terminal simulations via CheerpX/WebVM (PR2).
- CheerpX Debian runtime integration with Web Worker bridge and R2 artifact pipeline.
- Generic app scaffold CLI (`create-app`, `create-module`) with dry-run and rollback.
- Headless/MCP API for programmatic tool access (Node.js, esbuild bundle).
- Tool spaces platform with MCP discovery support.
- Pretty plotting platform (D3-based reusable charting).
- GIF export pipeline with quality profiles and worker-based encoding.
- Vitest 4 migration with headless-dist and headless-types test suites.

## [0.1.0] - 2026-02-24

### Added
- Initial project structure auditable release.
- Added CHANGELOG.md
- Added .nvmrc to pin Node version.
- Added PWA manifest.
- Added CI/CD structural improvements.
- Added i18n integrity check script and CI integration.
- Added Prettier and .prettierrc for code formatting.
- Added .editorconfig for editor consistency.
- Updated .gitignore to track package-lock.json.
- Updated prebuild script to run integrity, format, and lint checks.
