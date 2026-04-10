
# Contributing to Utildex

Thank you for your interest in contributing to Utildex! We welcome new tools, bug fixes, and performance improvements.

Utildex is a **local-first**, **zoneless** Angular application designed for modularity.

---

## Architecture Overview

To keep the application fast and lightweight, Utildex uses a specific architectural pattern:

1.  **Tool Contracts (`src/tools/*/*.contract.ts`):** Each tool declares metadata, type contract, widget config, and cost in a local contract file.
2.  **Tool Kernels (`src/tools/*/*.kernel.ts`):** Pure processing logic is isolated from Angular/UI so it can be reused in pipelines and tested independently.
3.  **Lazy Loading (`src/core/tool-registry.ts`):** Components, contracts, and kernels are loaded on demand via dynamic imports.
4.  **Zoneless Angular:** We do not use `Zone.js`. All state changes must be handled via **Signals**.

### Centralized Runtime Resources

To keep assets maintainable and avoid scattered URL/path construction, all shared runtime resources must be declared in central registries:

1. **Language-owned visual assets:** `src/data/languages.ts`
  - Keep `flagCode` for locale metadata.
  - Use `flagAsset` as the canonical flag path consumed by UI components.
2. **Compute/runtime assets (workers, wasm, etc.):** `src/core/runtime-resources.ts`
  - Register worker URLs and other runtime-heavy resources here.
  - Components/tools should use accessor helpers (for example `getWorkerResource(...)`) instead of hardcoding paths.

Rule: if a resource may be reused by more than one component, or may evolve over time, add it to a central registry first.

### Tool Spaces

Tool Spaces are shared across UI and headless/MCP discovery.

Reference: `docs/platform/tool-spaces/README.md`.

When updating Tool Spaces:

1. Edit or add a space contract in `src/data/tool-spaces/*/space.contract.ts`.
2. Register it in `src/data/tool-space-registry.ts`.
3. Ensure each `toolId` exactly matches a registered tool ID.
4. Keep group and tool ordering intentional (do not reorder without UX/API reason).
5. Validate with `npm run build:headless` and review space issues from the headless APIs when using `mcpCompatibleOnly`.

Important: shared space resolution belongs in `src/core/tool-space-resolver.ts`. Do not duplicate resolution logic in UI-only or headless-only layers.

---

## Adding a New Tool

Follow these steps to integrate a new utility into the system.

### 1. Create Tool Directory
Create a new folder in `src/tools/` using **kebab-case** (e.g., `src/tools/uuid-generator`).

### 2. Scaffold Files
Copy the contents of `src/templates/tool/` into your new directory. You should have:
*   `uuid-generator.component.ts` (The logic & UI)
*   `uuid-generator.contract.ts` (Metadata + type contract)
*   `uuid-generator.kernel.ts` (Pure processing logic)
*   `i18n/` (Localization files: `en.ts`, `fr.ts`, etc.)

### 3. Configure Contract (`*.contract.ts`)
This file defines how the app "sees" your tool.
*   **id**: Must be unique and kebab-case.
*   **metadata**: Name, description, icon, categories, tags, color.
  *   **Description ending (required):** End every description with the local equivalent of: `No data leaves your device. Works fully offline; feel free to disconnect.`
  *   Keep this privacy/offline guarantee explicit in each supported language.
*   **types**: Input traits and output format.
*   **widget**: Configuration for the dashboard grid.
*   **cost**: One of `low`, `medium`, `high`.

```typescript
import { ToolContract } from '../../core/tool-contract';
import { TRAITS } from '../../core/types/traits';

export const contract: ToolContract = {
  id: 'uuid-generator',
  metadata: {
    name: { en: 'UUID Generator', fr: 'Generateur UUID' },
    description: { en: 'Generate version 4 UUIDs.' },
    icon: 'fingerprint',
    version: '1.0.0',
    categories: ['Developer'],
    tags: ['uuid', 'guid', 'generator'],
    color: '#10b981',
  },
  types: {
    input: { traits: [TRAITS.text] },
    output: { format: 'text' },
  },
  widget: {
    supported: true,
    defaultCols: 2,
    defaultRows: 1,
    presets: [
      { label: { en: 'Compact' }, cols: 1, rows: 1 },
      { label: { en: 'Full' }, cols: 2, rows: 1 },
    ],
  },
  cost: 'low',
};
```

### 4. Implement Component Logic
Rename the class and selector in your component file. Use the **Tool Template** (`src/templates/tool/`) as your base.

**Requirements:**
*   **Standalone:** Must be `standalone: true`.
*   **Inputs:** You **MUST** define `isWidget` and `widgetConfig` inputs.
*   **State:** Use `ToolState` for managing and persisting data.
*   **Zoneless:** Use `signal`, `computed`, and `effect`.

```typescript
@Component({
  selector: 'app-uuid-generator',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, FormsModule, BubbleDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr })
  ],
  template: `...` // See src/templates/tool/template.component.ts
})
export class UuidGeneratorComponent {
  // Required Inputs
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);
  
  // Services
  t = inject(ScopedTranslationService);
  db = inject(DbService);

  // State (Auto-persisted to IndexedDB)
  private state = new ToolState('uuid-gen', { count: 0 }, this.db);
  count = this.state.select('count');
}
```

### 5. Register the Tool (The Wiring)
Since we don't scan directories at runtime, you must manually register the tool in **1 place**:

1.  **The Registry (`src/core/tool-registry.ts`):**
    Add component, contract, and kernel lazy loaders. **Important:** The key must match your tool's `id`.
    ```typescript
    export const TOOL_REGISTRY_MAP = {
      // ... existing tools
      'uuid-generator': {
        component: () => import('../tools/uuid-generator/uuid-generator.component').then(m => m.UuidGeneratorComponent),
        contract: () => import('../tools/uuid-generator/uuid-generator.contract').then(m => m.contract),
        kernel: () => import('../tools/uuid-generator/uuid-generator.kernel'),
      },
    };
    ```

---

## Design & Styling Guidelines

### 1. Widget Support
Your component is responsible for rendering different views based on the `isWidget` signal.

**Recommended Pattern:**
use a `computed` signal to determine the view mode:
```typescript
viewMode = computed(() => {
  const c = this.widgetConfig();
  if (c?.cols === 1 && c?.rows === 1) return 'compact';
  if (c?.cols === 2 && c?.rows === 1) return 'wide';
  if (c?.cols === 1 && c?.rows === 2) return 'tall';
  return 'default';
});
```

*   **Full View (`!isWidget()`):** The complete tool interface. Must be wrapped in `<app-tool-layout toolId="...">`.
*   **Widget View (`isWidget()`):** A compact, dashboard-friendly version.
    *   **Do NOT** use `<app-tool-layout>` in widget mode.
    *   Use the `viewMode` logic to adapt to grid sizes.
  *   Choose widget sizes carefully. If a size cannot be made genuinely useful for the tool (for example, complex structured outputs in 1x1), do not expose that preset.
    *   **Header Policy:** Every widget **MUST** include a visual header containing the Tool Icon and Tool Name/Title.
        *   *Exception:* Purely visual widgets (like an Image Frame) may omit the header if the content is self-explanatory.

### 2. Help Bubbles
Use the `BubbleDirective` to show helpful tooltips.
```html
<span [appBubble]="'HELP_KEY'" bubblePos="top">help</span>
```

### 3. Theming (Accent Color)
The app supports dynamic accent colors (Blue, Green, Purple, etc.) set by the user.
*   **Text:** Use `text-primary`.
*   **Background:** Use `bg-primary`.
*   **Borders:** Use `border-primary`.
*   **Faint Backgrounds:** Use `bg-primary/10` or `bg-primary/5`.

*Example:*
```html
<button class="bg-primary text-white hover:opacity-90">Generate</button>
```

### 4. Dark Mode
All tools must support Dark Mode fully using Tailwind's `dark:` modifier.
*   Backgrounds: `bg-white dark:bg-slate-800`
*   Text: `text-slate-900 dark:text-white`
*   Borders: `border-slate-200 dark:border-slate-700`

### 5. Responsiveness
Tools must work on mobile devices.
*   Use `flex-col` on mobile and `flex-row` on desktop.
*   Avoid fixed widths (e.g., `w-[500px]`). Use `max-w-xl` or percentages.

### 6. Frosted Glass Surfaces (Concise Spec)
Use this for card/modal surfaces that should match `tool-card`:
*   **Base:** translucent background + blur + soft border (`background: rgba(..., ~0.5)`, `backdrop-filter: blur(20px) saturate(180%)`, `border: 1px solid rgba(..., low alpha)`).
*   **Depth:** layered shadow with subtle inset highlight (outer shadow + `inset 0 0.5px 0 ...`).
*   **Hover:** slight lift (`translateY(-2px to -3px)`), stronger colored shadow, and tinted border (prefer `color-mix` with tool/accent color).
*   **Dark mode:** keep translucency (not opaque), lower border alpha, and use deeper shadows instead of brighter fills.
*   **Scope:** prioritize reusable surfaces first (cards, modals, floating panels, secondary action buttons) before one-off decorative elements.

---

## Internationalization (i18n)

Utildex uses a **Scoped Translation** pattern. Each tool carries its own translation dictionary.

Quality rule: preserve proper language spelling and punctuation in translation files (including accents/diacritics such as French `é`, `à`, `ç`). Avoid ASCII-only transliteration for user-facing copy.

1.  **Create translation files:** `src/tools/my-tool/i18n/en.ts`.
    ```typescript
    export default {
      "TITLE": "My Tool",
      "BTN_GENERATE": "Generate"
    };
    ```
2.  **Provide them in Component:**
    ```typescript
    providers: [ provideTranslation({ en: () => en, fr: () => fr }) ]
    ```
3.  **Use in Template:**
    ```html
    <button>{{ t.map()['BTN_GENERATE'] }}</button>
    ```

---

## SEO (Search Engine Optimization)

SEO is handled **automatically** by the `SeoService` based on your tool contract metadata.

*   **Title:** The app sets `<title>` to `"${Tool Name} - Utildex"`.
*   **Description:** The app sets `<meta name="description">` to your tool's description from contract metadata.
*   **Route:** The URL `#/tools/your-tool-id` is generated from the ID.

**Requirement:** Ensure your `name` and `description` in `*.contract.ts` are descriptive and keyword-rich.

---

## Data Persistence (Local-First)

Never send user data to a server.
*   **Tool State:** Use `ToolState` (wraps `DbService`) to automatically persist component state.
    ```typescript
    state = new ToolState('my-tool', { count: 0 }, inject(DbService));
    ```
*   **User Preferences:** Use `PersistenceService` or `localStorage` for simple flags.
*   **Binary/Large Data:** Use `DbService` directly.

**Example using PersistenceService:**
```typescript
constructor() {
  // Automatically saves 'options' signal to IndexedDB under key 'my-tool-opts'
  this.persistence.storage(this.options, 'my-tool-opts');
}
```

Happy Coding!

By contributing, you agree your contributions are licensed under Apache 2.0 with Commons Clause.