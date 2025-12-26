
# Contributing to Utildex

Thank you for your interest in contributing to Utildex! We welcome new tools, bug fixes, and performance improvements.

Utildex is a **local-first**, **zoneless** Angular application designed for modularity.

---

## 🏗️ Architecture Overview

To keep the application fast and lightweight, Utildex uses a specific architectural pattern:

1.  **Metadata Registry (`src/services/tool.service.ts`):** A lightweight JSON list of all tools is loaded at startup. This enables search, routing, and lists without loading the actual tool code.
2.  **Lazy Loading (`src/core/tool-registry.ts`):** The actual tool component code is fetched *only* when the user opens the tool or places its widget.
3.  **Zoneless Angular:** We do not use `Zone.js`. All state changes must be handled via **Signals**.

---

## 🚀 Adding a New Tool

Follow these steps to integrate a new utility into the system.

### 1. Create Tool Directory
Create a new folder in `src/tools/` using **kebab-case** (e.g., `src/tools/uuid-generator`).

### 2. Scaffold Files
Copy the contents of `src/templates/tool/` into your new directory. You should have:
*   `uuid-generator.component.ts` (The logic & UI)
*   `metadata.json` (The definition)
*   `i18n/` (Localization files: `en.ts`, `fr.ts`, etc.)

### 3. Configure Metadata (`metadata.json`)
This file defines how the app "sees" your tool.
*   **id**: Must be unique and kebab-case.
*   **routePath**: Must match `tools/[id]`.
*   **widget**: Configuration for the dashboard grid.

```json
{
  "id": "uuid-generator",
  "name": { "en": "UUID Generator", "fr": "Générateur UUID" },
  "description": { "en": "Generate version 4 UUIDs." },
  "icon": "fingerprint",
  "categories": ["Developer"],
  "tags": ["uuid", "guid", "generator"],
  "color": "#10b981",
  "routePath": "tools/uuid-generator",
  "widget": {
    "supported": true,
    "defaultCols": 2,
    "defaultRows": 1,
    "presets": [
        { "label": { "en": "Compact" }, "cols": 1, "rows": 1 },
        { "label": { "en": "Full" }, "cols": 2, "rows": 1 }
    ]
  }
}
```

### 4. Implement Component Logic
Rename the class and selector in your component file.

**Requirements:**
*   **Standalone:** Must be `standalone: true`.
*   **Inputs:** You **MUST** define `isWidget` and `widgetConfig` inputs.
*   **Zoneless:** Use `signal`, `computed`, and `effect`. Do not rely on automatic change detection.

```typescript
@Component({
  selector: 'app-uuid-generator',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, FormsModule],
  providers: [
    // Register tool-specific translations
    provideTranslation({ en: () => en, fr: () => fr })
  ],
  template: `...` // See Styling section below
})
export class UuidGeneratorComponent {
  // Required Inputs
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null); // Access grid dimensions via widgetConfig().cols / .rows
  
  t = inject(ScopedTranslationService);
}
```

### 5. Register the Tool (The Wiring)
Since we don't scan directories at runtime, you must manually register the tool in **2 places**:

1.  **The Registry (`src/services/tool.service.ts`):**
    Copy the object from your `metadata.json` and paste it into the `rawRegistry` array.
    *Note: The `routePath` property is automatically generated, but you should define it in metadata for clarity.*

2.  **The Lazy Map (`src/core/tool-registry.ts`):**
    Add the dynamic import mapping. **Important:** The key must match your tool's `id`.
    ```typescript
    export const TOOL_COMPONENT_MAP = {
      // ... existing tools
      'uuid-generator': () => import('../tools/uuid-generator/uuid-generator.component').then(m => m.UuidGeneratorComponent),
    };
    ```

---

## 🎨 Design & Styling Guidelines

### 1. Widget Support
Your component is responsible for rendering two different views based on the `isWidget` signal:
*   **Full View (`!isWidget()`):** The complete tool interface. Must be wrapped in `<app-tool-layout toolId="...">`.
*   **Widget View (`isWidget()`):** A compact, dashboard-friendly version.
    *   **Do NOT** use `<app-tool-layout>` in widget mode.
    *   Use `widgetConfig()` to check dimensions (e.g., show less info if `cols === 1`).
    *   Ensure it handles click events or provides quick actions.
    *   **Header Policy:** Every widget **MUST** include a visual header containing the Tool Icon and Tool Name/Title. This ensures users can identify the widget on their dashboard.
        *   *Exception:* Purely visual widgets (like an Image Frame) may omit the header if the content is self-explanatory.

### 2. Theming (Accent Color)
The app supports dynamic accent colors (Blue, Green, Purple, etc.) set by the user.
*   **Text:** Use `text-primary`.
*   **Background:** Use `bg-primary`.
*   **Borders:** Use `border-primary`.
*   **Faint Backgrounds:** Use `bg-primary/10` or `bg-primary/5`.

*Example:*
```html
<button class="bg-primary text-white hover:opacity-90">Generate</button>
```

### 3. Dark Mode
All tools must support Dark Mode fully using Tailwind's `dark:` modifier.
*   Backgrounds: `bg-white dark:bg-slate-800`
*   Text: `text-slate-900 dark:text-white`
*   Borders: `border-slate-200 dark:border-slate-700`

### 4. Responsiveness
Tools must work on mobile devices.
*   Use `flex-col` on mobile and `flex-row` on desktop.
*   Avoid fixed widths (e.g., `w-[500px]`). Use `max-w-xl` or percentages.

---

## 🌍 Internationalization (i18n)

Utildex uses a **Scoped Translation** pattern. Each tool carries its own translation dictionary.

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

## 🔍 SEO (Search Engine Optimization)

SEO is handled **automatically** by the `SeoService` based on your `metadata.json`.

*   **Title:** The app sets `<title>` to `"${Tool Name} - Utildex"`.
*   **Description:** The app sets `<meta name="description">` to your tool's description from metadata.
*   **Route:** The URL `#/tools/your-tool-id` is generated from the ID.

**Requirement:** Ensure your `name` and `description` in `metadata.json` are descriptive and keyword-rich.

---

## 💾 Data Persistence (Local-First)

Never send user data to a server.
*   **Temporary Data:** Keep it in component state signals.
*   **User Preferences:** Use `PersistenceService` or `localStorage`.
*   **Large Data:** Use `DbService` (IndexedDB Wrapper).

**Example using PersistenceService:**
```typescript
constructor() {
  // Automatically saves 'options' signal to IndexedDB under key 'my-tool-opts'
  this.persistence.storage(this.options, 'my-tool-opts');
}
```

Happy Coding!
