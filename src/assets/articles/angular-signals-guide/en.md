
# Mastering Angular Signals

Signals are the new standard for reactivity in Angular. They provide a granular way to track state changes and optimize rendering updates.

## What is a Signal?

A signal is a wrapper around a value that can notify interested consumers when that value changes. Signals can contain any value, from simple primitives to complex data structures.

```typescript
import { signal, computed, effect } from '@angular/core';

// 1. Writable Signal
const count = signal(0);

// Reading the value (always call it as a function)
console.log(count()); // 0

// Updating the value
count.set(5);
count.update(value => value + 1);
```

## Computed Signals

Computed signals derive their value from other signals. They are lazy (only calculated when read) and memoized (cached until dependencies change).

```typescript
const count = signal(1);
const doubleCount = computed(() => count() * 2);

console.log(doubleCount()); // 2
```

## Effects

Effects are operations that run whenever one of the signals they read changes. They are useful for logging, syncing with `localStorage`, or manual DOM manipulation.

```typescript
effect(() => {
  console.log(`The current count is: ${count()}`);
});
```

## Why use Signals over RxJS BehaviorSubjects?

1.  **No Subscriptions:** You don't need to manually subscribe or unsubscribe.
2.  **Glitch-free:** Signals guarantee glitch-free execution (no intermediate invalid states).
3.  **Zoneless Ready:** Signals are the key to removing `Zone.js` from Angular, making applications faster and lighter.

## Best Practices

*   Use `signal()` for local component state.
*   Use `computed()` for derived state (e.g., filtering a list).
*   Avoid side effects in `computed()`. Use `effect()` for side effects.
