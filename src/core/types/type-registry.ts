/**
 * TypeRegistry — loads traits and formats, expands implications,
 * computes trait bitmasks, and provides compatibility checks.
 */

import { Trait, TRAITS, TRAIT_IMPLICATIONS } from './traits';
import { FORMATS, FormatDefinition, FormatId } from './formats';

/** Ordered list of all known traits for bitmask assignment. */
const TRAIT_LIST: readonly Trait[] = Object.values(TRAITS);

/** Map each trait to a unique bit position. */
const TRAIT_BIT: ReadonlyMap<Trait, number> = new Map(
  TRAIT_LIST.map((trait, index) => [trait, 1 << index]),
);

/**
 * Expand a set of direct traits to include all implied traits.
 */
export function expandTraits(directTraits: readonly Trait[]): Trait[] {
  const expanded = new Set<Trait>(directTraits);
  let changed = true;
  while (changed) {
    changed = false;
    for (const trait of expanded) {
      const implied = TRAIT_IMPLICATIONS[trait];
      if (implied) {
        for (const imp of implied) {
          if (!expanded.has(imp)) {
            expanded.add(imp);
            changed = true;
          }
        }
      }
    }
  }
  return [...expanded];
}

/**
 * Compute a bitmask from a list of traits.
 */
export function traitMask(traits: readonly Trait[]): number {
  let mask = 0;
  for (const trait of traits) {
    mask |= TRAIT_BIT.get(trait) ?? 0;
  }
  return mask;
}

/**
 * Compute the expanded bitmask for a format (direct + implied traits).
 */
export function formatMask(formatId: FormatId): number {
  const format = FORMATS[formatId];
  if (!format) return 0;
  return traitMask(expandTraits(format.traits));
}

/**
 * Check if an output mask satisfies a required trait mask.
 *
 * Returns true when all required traits are present:
 *   (outputMask & requiredMask) === requiredMask
 */
export function isCompatible(outputMask: number, requiredMask: number): boolean {
  return (outputMask & requiredMask) === requiredMask;
}

/**
 * Given a required mask and an output mask, return the list of
 * missing trait names.
 */
export function missingTraits(outputMask: number, requiredMask: number): Trait[] {
  const missing: Trait[] = [];
  for (const [trait, bit] of TRAIT_BIT) {
    if ((requiredMask & bit) !== 0 && (outputMask & bit) === 0) {
      missing.push(trait);
    }
  }
  return missing;
}

/**
 * Get the full expanded trait list for a format.
 */
export function getFormatTraits(formatId: FormatId): Trait[] {
  const format = FORMATS[formatId];
  if (!format) return [];
  return expandTraits(format.traits);
}

/**
 * Get a format definition by ID.
 */
export function getFormat(formatId: FormatId): FormatDefinition | undefined {
  return FORMATS[formatId];
}

export { TRAIT_LIST, TRAIT_BIT };
