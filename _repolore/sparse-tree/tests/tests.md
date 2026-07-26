# tests/ — Test Infrastructure

Four separate test configurations because jsdom (browser) and Node tests cannot coexist in the same run.

## Configurations

### 1. `vitest.config.ts` — Angular/Browser Unit Tests

- **Environment**: jsdom
- **Includes**: `src/**/*.spec.ts` (excludes `src/headless/**/*.spec.ts`)
- **Plugin**: `@analogjs/vite-plugin-angular` (Angular template compiler for Vite)
- **Setup**: `src/test-setup.ts` — TestBed, fake-indexeddb (auto), mock `matchMedia`/`ResizeObserver`/`IntersectionObserver`
- **Coverage**: v8 provider, text + html
- **What it covers**: All Angular component, service, directive, and pipe tests that need DOM

```bash
npx vitest --config vitest.config.ts
# or: npm run test:web
```

### 2. `vitest.config.headless.ts` — Headless/Node Unit Tests

- **Environment**: node
- **Includes**: `src/headless/**/*.spec.ts`, `tests/headless/**/*.spec.ts`
- **Pool**: forks (process isolation)
- **Coverage**: v8 provider, text + html
- **What it covers**: Pure-logic headless module tests, MCP resolution, tool-space resolver — runs without Angular or browser APIs

```bash
npx vitest --config vitest.config.headless.ts
# or: npm run test:headless
```

### 3. `vitest.config.headless.dist.ts` — Built Artifact Tests

- **Environment**: node
- **Includes**: `tests/headless-dist/**/*.spec.ts`
- **Pool**: forks
- **No coverage**

Three tests against the **built** `dist-headless/headless/index.js`:

| Test | Assertion |
|------|-----------|
| `bundle-size.spec.ts` | Bundle ≤ 450 KB |
| `exports.spec.ts` | All 7 public functions exported and callable |
| `no-browser-globals.spec.ts` | No browser globals (`window`, `document`, `localStorage`, etc.) in bundle |

```bash
npx vitest --config vitest.config.headless.dist.ts
# or: npm run test:headless:dist
```

### 4. `tests/headless-types/` — Type-Level Smoke Test

- **Compile-only**: `tsc --noEmit` on `consumer-smoke.ts`
- **What it covers**: Validates that `utildex/headless` type declarations are valid for external consumers (imports types, exercises API shape)

```bash
npx tsc -p tests/headless-types/tsconfig.json --noEmit
# or: npm run test:headless:types
```

## Test setup (`src/test-setup.ts`)

- `@analogjs/vitest-angular/setup-zone` — Zone.js for Angular TestBed
- `setupTestBed({ zoneless: false })` — classic Zone mode
- `fake-indexeddb/auto` — monkey-patches `indexedDB` for all tests
- Mock `window.matchMedia` — returns non-matching query with `vi.fn()` stubs
- Mock `ResizeObserver`, `IntersectionObserver` — all methods stubbed

## Key decisions

- **Three vitest configs** because jsdom and Node need different environments and setup
- **Headless dist tests validate the build output**, not source — catches tree-shaking misses, browser API leaks, missing exports
- **Type smoke test runs compile-only** (`noEmit: true`) — validates consumer type resolution without running code
- **Fork pool** for headless tests ensures clean state between test files
- **Co-located specs**: `*.spec.ts` next to source files (e.g., `module.service.spec.ts` alongside `module.service.ts`)

## Directory note

- `tests/` — integration/artifact tests (headless-dist, headless-types)
- `test/foo/` — empty placeholder directory (likely legacy)
- `src/**/*.spec.ts` — unit tests co-located with source

## Related

- → Read: `_repolore/tree/src/headless/headless.md` for headless API surface
- → Read: `_repolore/tree/src/services/services.md` for services tested by `vitest.config.ts`

