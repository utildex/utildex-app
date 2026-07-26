# src/components/ — Shared UI Components

25 standalone Angular components shared across all three apps. Changes here affect utildex, synedex, and simudex equally. No human docs exist for this library — this RepoLore node is the primary reference.

## Component catalog

### Core layout (used on every page)

| Component | Role |
|-----------|------|
| `tool-layout` | Standard module page shell: breadcrumbs, back button, header with icon/title/description, content projection slot. Every tool/game/simulation uses this. Scoped i18n. |
| `app-footer` | Global footer with links (GitHub, privacy, terms). |
| `action-bar` | Top action bar with navigation and controls. |
| `background` | Decorative background elements. |

### Module discovery & listing

| Component | Role |
|-----------|------|
| `dashboard` | **Most complex component.** Main landing page: tool carousels, featured sections, widget grid. Depends on `ModuleService` for tool resolution and widget layout. Scoped i18n. |
| `tool-card` | Individual module listing card with icon, name, description, category badge. |
| `carousel` | Horizontal scrollable card carousel for module categories. |
| `widget-host` | Dashboard widget container with drag/drop support via `ModuleService`. |
| `dashboard-modals` | Modal dialogs surfaced from the dashboard. |

### User features

| Component | Role |
|-----------|------|
| `command-palette` | Cmd+K search palette: searches modules, performs actions. Uses `ModuleService`, `ShortcutService`. Scoped i18n. |
| `settings-modal` | Full settings panel: theme (dark/light, primary color, font, density), language, clipboard history, storage management, offline tools, virtual pets toggle, tour reset. ~15 service dependencies. Scoped i18n. |
| `clipboard-history` | Clipboard history list with copy/paste controls. |
| `download-status` | Download progress indicator (offline tool downloads). |
| `network-status` | Online/offline status indicator. |
| `error-overlay` | Global error display overlay. |
| `tour-overlay` | Multi-step guided tour UI with `TourService`. |
| `guide` | Contextual tooltips with `GuideService`. |
| `toast` | Toast notification display (success, error, info). |
| `zone-picker` | Timezone selector. |

### Content & articles

| Component | Role |
|-----------|------|
| `article-card` | Article listing card for the articles page. |
| `dropdown` | Reusable dropdown menu component. |

### App-specific

| Component | App | Role |
|-----------|-----|------|
| `terminal-platform` | Simudex | Terminal emulator UI with tab management, I/O streaming. Integrates with `SandboxTerminalSessionService`. Most complex Simudex component. |
| `virtual-pets` | Utildex | Virtual pet display with custom sprite resolution. |
| `processing-loader` | All | Loading states with rotating tips. State machine with variants. → Read: `docs/platform/processing-loader/README.md` |

## Complexity ranking

| Rank | Component | Reason |
|------|-----------|--------|
| 1 | `dashboard` | Widget grid, drag/drop, carousels, multiple data sources |
| 2 | `settings-modal` | ~15 service dependencies, multi-tab form |
| 3 | `terminal-platform` | Terminal emulation, tab management, I/O streaming |
| 4 | `command-palette` | Fuzzy search, keyboard navigation, multi-type results |
| 5 | `tool-layout` | Shared shell used by every module |

## Patterns

- All components are Angular standalone (`standalone: true`)
- Most have their own scoped i18n via `provideTranslation()` with `I18N_MAP`
- Heavy use of `inject()` for service dependencies and Angular Router for navigation
- Signals for local component state

## Common pitfalls

- **Shared across all apps** — a change to `tool-layout` or `settings-modal` affects utildex, synedex, AND simudex. Test with `build:all`.
- **Capability gating** — some components (e.g., dashboard widgets) should only render if `AppConfigService.capabilities` allows it. Missing gates cause feature leakage.
- **`terminal-platform`** imports sandbox services that only work with CheerpX/WebVM — tree-shaking should remove it from non-Simudex builds, but verify.
- **`dashboard`** is tightly coupled to `ModuleService` — changes to module contracts or widget config can break dashboard rendering.

## Related

- → Read: `_repolore/tree/src/services/services.md` for services these components consume
- → Read: `_repolore/tree/src/core/core.md` for ModuleContract and AppConfig
- → Read: `docs/platform/processing-loader/README.md` for processing-loader specifics
- → Read: `docs/platform/simudex/README.md` for terminal-platform context

