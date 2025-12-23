
# Maîtriser les Signals Angular

Les Signals sont le nouveau standard de réactivité dans Angular. Ils offrent une manière granulaire de suivre les changements d'état et d'optimiser les mises à jour du rendu.

## Qu'est-ce qu'un Signal ?

Un signal est une enveloppe autour d'une valeur qui peut notifier les consommateurs intéressés lorsque cette valeur change.

```typescript
import { signal, computed, effect } from '@angular/core';

// 1. Signal accessible en écriture
const count = signal(0);

// Lire la valeur
console.log(count()); // 0

// Mettre à jour
count.set(5);
count.update(value => value + 1);
```

## Signals Calculés (Computed)

Les signals calculés dérivent leur valeur d'autres signals. Ils sont paresseux (calculés uniquement lors de la lecture) et mémoïsés.

```typescript
const count = signal(1);
const doubleCount = computed(() => count() * 2);

console.log(doubleCount()); // 2
```

## Effets (Effects)

Les effets sont des opérations qui s'exécutent chaque fois que l'un des signals qu'ils lisent change. Utile pour les logs ou la synchro localStorage.

```typescript
effect(() => {
  console.log(`Le compte actuel est : ${count()}`);
});
```

## Pourquoi utiliser les Signals ?

1.  **Pas d'abonnements :** Pas besoin de `subscribe` ou `unsubscribe`.
2.  **Sans glitch :** Garantit une exécution cohérente.
3.  **Prêt pour le Zoneless :** Clé pour supprimer `Zone.js` et rendre Angular plus rapide.
