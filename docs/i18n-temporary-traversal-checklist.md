# Temporary i18n Full Traversal Checklist

This is a temporary cross-session checklist for validating and fixing translations across all four runtime languages (en, fr, es, zh).

Generated: 2026-06-01T08:59:46.970Z

## Scope

- Target languages: en.ts, fr.ts, es.ts, zh.ts
- Target folders: all i18n folders under src
- Target i18n directories: 68
- Target language files to traverse: 254

## Folder Split Summary

| Folder family | i18n dirs | en | fr | es | zh | Target files |
|---|---:|---:|---:|---:|---:|---:|
| src/apps/utildex/tools | 33 | 33 | 33 | 33 | 33 | 132 |
| src/pages | 14 | 14 | 14 | 14 | 14 | 56 |
| src/components | 13 | 13 | 13 | 13 | 13 | 52 |
| src/apps/synedex/games | 2 | 2 | 2 | 2 | 2 | 8 |
| src (other) | 1 | 1 | 1 | 1 | 1 | 4 |
| src/templates | 1 | 1 | 1 | 0 | 0 | 2 |
| src/data | 4 | 0 | 0 | 0 | 0 | 0 |

## Session Log

| Date | Session owner | Folders covered | Files reviewed | Notes |
|---|---|---|---:|---|
| 2026-06-01 | agent | zh.ts under src/apps/utildex/tools | 33 | Restored from clean git history (commit 6e51957 old-path). 0 corrupted characters remain post-fix. |

## Per-Directory Checklist

Mark each language as done after review/fix for that directory. Use n/a rows as non-targets for this pass.

| en | fr | es | zh | i18n directory |
|---|---|---|---|---|
| [ ] | [ ] | [ ] | [ ] | src/apps/synedex/games/mental-math/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/synedex/games/sudoku/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/absi-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/bai-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/base64-encoder-decoder/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/bmi-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/body-fat-deurenberg/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/code-snippet-viewer/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/cron-explainer/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/date-time-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/diff-checker/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/hash-generator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/homa-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/ics-event-generator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/image-converter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/image-resizer/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/img-to-pdf/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/json-formatter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/jwt-decoder/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/lorem-ipsum/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/markdown-preview/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/meeting-time-finder/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/merge-pdf/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/password-generator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/pdf-to-img/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/qr-studio/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/rotate-pdf/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/simple-2d-plots/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/split-pdf/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/time-format-converter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/timestamp-converter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/timezone-converter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/unit-converter/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/url-encoder-decoder/i18n |
| [ ] | [ ] | [ ] | [ ] | src/apps/utildex/tools/whr-calculator/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/action-bar/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/clipboard-history/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/command-palette/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/dashboard-modals/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/dashboard/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/download-status/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/error-overlay/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/network-status/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/processing-loader/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/settings-modal/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/tool-card/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/tool-layout/i18n |
| [ ] | [ ] | [ ] | [ ] | src/components/virtual-pets/i18n |
| n/a | n/a | n/a | n/a | src/data/articles/i18n |
| n/a | n/a | n/a | n/a | src/data/tool-spaces/developer/i18n |
| n/a | n/a | n/a | n/a | src/data/tool-spaces/health/i18n |
| n/a | n/a | n/a | n/a | src/data/tool-spaces/office/i18n |
| [ ] | [ ] | [ ] | [ ] | src/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/all-tools/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/article-reader/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/articles/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/categories/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/category-detail/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/history/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/legal/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/privacy/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/simudex-welcome/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/synedex-welcome/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/terms/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/tool-space-host/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/tool-spaces/i18n |
| [ ] | [ ] | [ ] | [ ] | src/pages/user-dashboard/i18n |
| [ ] | [ ] | n/a | n/a | src/templates/tool/i18n |

## Completion Criteria

- Every non-n/a checkbox above is marked done.
- Random spot checks in UI for all four languages on changed tools/pages/components.
- Optional final scan for mojibake patterns after each batch and once at the end.
