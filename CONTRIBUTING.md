
# Contributing to Utildex

Thank you for your interest in contributing to Utildex! We welcome new tools, bug fixes, and performance improvements.

Utildex is a **local-first**, **zoneless** Angular application designed for modularity.

---

## 🏗️ Architecture Overview

Before adding a tool, it is helpful to understand how Utildex manages dependencies and rendering.

### 1. The Registry Pattern (Metadata vs. Implementation)
To keep the initial bundle size small, Utildex separates **Metadata** from **Implementation**.

*   **Metadata (`src/services/tool.service.ts`):** We load a lightweight JSON object for *every* tool at startup. This allows features like Search, Categorization, and Command Palette to work instantly without downloading the actual code for the tools.
*   **Implementation (`src/core/tool-registry.ts`):** The actual Component code is mapped via dynamic `import()` functions. Angular's build system splits these into separate chunks (e.g., `chunk-LOREM.js`, `chunk-UUID.js`).

### 2. Async Storage (Local-First)
Data persistence is handled via **IndexedDB** wrapped in a `DbService`. This ensures the main thread is never blocked by large reads/writes.
*   **Reading:** Always async (`await db.get(...)`).
*   **Writing:** Always async (`await db.set(...)`).
*   **Signals Integration:** The `PersistenceService` provides helpers to sync Angular Signals with IndexedDB automatically.

### 3. The Widget Lifecycle
When a user adds a tool to their dashboard, the following technical flow occurs:

1.  **Discovery:** The `UserDashboardComponent` filters the metadata registry for tools where `widget.supported === true`.
2.  **Instantiation:** A `DashboardWidget` object is created.
3.  **Rendering (The `WidgetHostComponent`):**
    *   The dashboard iterates over widgets and renders an `<app-widget-host>` for each.
    *   The Host reads the `toolId` and calls `getToolComponent(id)` from `src/core/tool-registry.ts`.
    *   This executes the lazy import.
    *   Once the Promise resolves, the Host uses Angular's **`NgComponentOutlet`** to dynamically instantiate the component class.
    *   **Input Injection:** The Host injects `inputs: { isWidget: true, widgetConfig: { ... } }` into the component.

---

## 🚀 Adding a New Tool

Follow these steps to integrate a new utility into the system.

### 1. Create Tool Directory
Create a new folder in `src/tools/` using **kebab-case** (e.g., `src/tools/uuid-generator`).

### 2. Scaffold Files
Copy the contents of `src/templates/tool/` into your new directory. You should have:
*   `uuid-generator.component.ts` (The logic & UI)
*   `metadata.json` (The definition)
*   `i18n/` (Localization files)

### 3. Configure Metadata (`metadata.json`)
This file defines how the app "sees" your tool before loading it.
*   **id**: Must be unique and kebab-case.
*   **routePath**: Must match `tools/[id]`.
*   **widget**: Configuration for the dashboard grid.

```json
{
  "id": "uuid-generator",
  "name": { "en": "UUID Generator" },
  "description": { "en": "Generate version 4 UUIDs." },
  "routePath": "tools/uuid-generator",
  "widget": {
    "supported": true,
    "defaultCols": 2,
    "defaultRows": 1
  }
}
```

### 4. Implement Component Logic
Rename the class and selector in your component file.

**Requirements:**
*   **Standalone:** Must be `standalone: true`.
*   **Inputs:** Must accept `isWidget` and `widgetConfig`.
*   **Zoneless:** Use `signal`, `computed`, and `effect`. Do not rely on `Zone.js` change detection.

```typescript
@Component({
  selector: 'app-uuid-generator',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent],
  template: `...`
})
export class UuidGeneratorComponent {
  isWidget = input<boolean>(false); 
  
  // Use PersistenceService to save state to IndexedDB
  persistence = inject(PersistenceService);
  value = signal(0);
  
  constructor() {
    this.persistence.storage(this.value, 'uuid-gen-val', 'number');
  }
}
```

### 5. Register the Tool (The Wiring)
Since we don't scan directories at runtime, you must manually register the tool in **2 places**:

1.  **The Registry (`src/services/tool.service.ts`):**
    Add your `metadata.json` content to the `rawRegistry` array.
    *Note: The router automatically handles `tools/:id`, so you do not need to update `app.routes.ts`.*

2.  **The Lazy Map (`src/core/tool-registry.ts`):**
    Add the dynamic import mapping. **Important:** The key must match your tool's `id`.
    ```typescript
    export const TOOL_COMPONENT_MAP = {
      // ... existing tools
      'uuid-generator': () => import('../tools/uuid-generator/uuid-generator.component').then(m => m.UuidGeneratorComponent),
    };
    ```

---

## 🎨 Coding Standards

*   **Styling:** Use **Tailwind CSS** exclusively.
*   **State:** Use **Angular Signals** (`signal`, `computed`, `effect`).
*   **Performance:**
    *   Use `ChangeDetectionStrategy.OnPush`.
    *   Avoid heavy computations in templates.
*   **I18n:**
    *   All user-facing text must be in `i18n/en.ts`.
    *   Use `ScopedTranslationService` to inject translations.

Happy Coding!
