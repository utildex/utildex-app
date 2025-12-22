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

### 2. The Widget Lifecycle
When a user adds a tool to their dashboard, the following technical flow occurs:

1.  **Discovery:** The `UserDashboardComponent` filters the metadata registry for tools where `widget.supported === true`.
2.  **Instantiation:** A `DashboardWidget` object is created. This is a serializable JSON object containing:
    *   `instanceId`: A UUID for this specific placement.
    *   `toolId`: The string ID of the tool (e.g., `'password-generator'`).
    *   `layout`: Grid coordinates (`x`, `y`, `w`, `h`).
3.  **Rendering (The `WidgetHostComponent`):**
    *   The dashboard iterates over widgets and renders an `<app-widget-host>` for each.
    *   The Host reads the `toolId` and calls `getToolComponent(id)` from `src/core/tool-registry.ts`.
    *   This executes the lazy import: `() => import('../tools/...').then(m => m.Component)`.
    *   Once the Promise resolves, the Host uses Angular's **`NgComponentOutlet`** to dynamically instantiate the component class inside the grid cell.
    *   **Input Injection:** The Host injects `inputs: { isWidget: true, widgetConfig: { cols: number, rows: number } }` into the component.
4.  **View Switching:**
    *   The tool component reads the `isWidget` signal.
    *   It uses Angular's control flow (`@if (!isWidget()) { ... } @else { ... }`) to render a minimized, compact interface instead of the full page layout.
    *   It reads `widgetConfig()` to determine layout (e.g. Compact 1x1 vs Wide 2x1).

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
    *   `defaultCols`/`defaultRows`: Default size if no presets are chosen.
    *   `presets`: Optional array of selectable sizes (e.g. Compact, Standard).

```json
{
  "id": "uuid-generator",
  "name": { "en": "UUID Generator" },
  "description": { "en": "Generate version 4 UUIDs." },
  "routePath": "tools/uuid-generator",
  "widget": {
    "supported": true,
    "defaultCols": 2,
    "defaultRows": 1,
    "presets": [
      { "label": { "en": "Compact" }, "cols": 1, "rows": 1 },
      { "label": { "en": "Standard" }, "cols": 2, "rows": 1 }
    ]
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
  template: `
    @if (!isWidget()) {
      <!-- Full Page View -->
      <app-tool-layout toolId="uuid-generator">
        <button (click)="generate()">Generate</button>
        <div class="text-4xl">{{ uuid() }}</div>
      </app-tool-layout>
    } @else {
      <!-- Widget View -->
      <div class="h-full p-4 bg-white dark:bg-slate-800 flex flex-col">
         
         @if (widgetConfig()?.cols === 1) {
            <!-- Compact Layout (1x1) -->
            <span class="text-xs font-bold text-slate-500">UUID</span>
            <div class="truncate">{{ uuid() }}</div>
         } @else {
             <!-- Standard Layout (2x1) -->
             <div class="flex justify-between">
                <span class="font-bold text-slate-500">UUID Generator</span>
                <button (click)="generate()">New</button>
             </div>
             <div class="font-mono">{{ uuid() }}</div>
         }
      </div>
    }
  `
})
export class UuidGeneratorComponent {
  isWidget = input<boolean>(false); 
  widgetConfig = input<{ cols: number, rows: number } | null>(null);

  uuid = signal('');
  // ... logic
}
```

### 5. Register the Tool (The Wiring)
Since we don't scan directories at runtime, you must manually register the tool in **3 places**:

1.  **The Registry (`src/services/tool.service.ts`):**
    Add your `metadata.json` content to the `toolsRegistry` array.

2.  **The Lazy Map (`src/core/tool-registry.ts`):**
    Add the dynamic import mapping. This tells the Widget Host how to find your code.
    ```typescript
    export const TOOL_COMPONENT_MAP = {
      // ... existing tools
      'uuid-generator': () => import('../tools/uuid-generator/uuid-generator.component').then(m => m.UuidGeneratorComponent),
    };
    ```

3.  **The Router (`src/app.routes.ts`):**
    Add a route so users can visit the full page (e.g., `https://utildex.app/#/tools/uuid-generator`).
    ```typescript
    {
      path: 'tools/uuid-generator',
      loadComponent: () => import('./tools/uuid-generator/uuid-generator.component').then(m => m.UuidGeneratorComponent),
      title: 'UUID Generator - Utildex'
    }
    ```

---

## 🎨 Coding Standards

*   **Styling:** Use **Tailwind CSS** exclusively. Do not create `.css` or `.scss` files.
*   **State:** Use **Angular Signals** (`signal`, `computed`, `effect`) for all state management.
*   **Performance:**
    *   Use `ChangeDetectionStrategy.OnPush` (Default in recent Angular versions, but good practice to be explicit).
    *   Avoid heavy computations in templates. Use `computed()` signals instead.
*   **I18n:**
    *   All user-facing text must be in `i18n/en.ts`.
    *   Use `ScopedTranslationService` to inject translations.
    *   Do not hardcode strings in HTML.

## 🧪 Testing
Currently, manual testing is required:
1.  Verify the tool works on its full page route.
2.  Go to "My Dashboard", enter Edit Mode, and add your tool widget.
3.  Verify that if presets are defined, you are prompted to choose a size.
4.  Verify the widget renders correctly in different sizes.
5.  Verify Dark Mode appearance.

Happy Coding!
