# Processing Loader

Lightweight visual cue for ongoing work. This component is presentational only and never runs business logic.

## Usage

```html
<app-processing-loader
  [active]="isGenerating()"
  [state]="generationState()"
  mode="overlay"
  [messages]="['Preparing frames...', 'Encoding GIF...']"
  [tips]="['Processing speed depends on your device and browser.']"
  [minVisibleMs]="600"
/>
```

## Minimal API

- `active: boolean` - show/hide loader
- `state: 'loading' | 'success' | 'error'` - visual state only
- `mode: 'inline' | 'overlay'` - placement
- `variant: 'dots' | 'bars'` - animation style (extensible)
- `messages: string[]` - rotating primary text
- `tips: string[]` - rotating secondary text; entries can be literal strings or translation keys
- `minVisibleMs: number` - avoids flicker on very fast tasks

The component ships with localized fallback text for its own defaults.

## Design Rules

- Parent component owns lifecycle (`active/state` updates from real events)
- Loader owns only visuals and text rotation
- New loader styles should be added as new `variant` values
