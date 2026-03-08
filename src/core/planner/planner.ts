/**
 * Planner — reasons about tool contracts for pipeline compatibility.
 *
 * Responsibilities:
 * - Check compatibility between tool outputs and inputs
 * - Provide explanation of incompatibilities
 * - Find conversion paths (future)
 *
 * The planner does NOT execute tools.
 * It only reasons about contracts, formats, and traits.
 */

import { Trait } from '../types/traits';
import { FormatId } from '../types/formats';
import {
  formatMask,
  traitMask,
  expandTraits,
  isCompatible,
  missingTraits,
} from '../types/type-registry';

/** Minimal contract shape needed by the planner. */
export interface PlannerContract {
  id: string;
  types: {
    input: { traits: readonly Trait[] };
    output: { format: FormatId };
  };
}

export interface CompatibilityResult {
  compatible: boolean;
  missingTraits: Trait[];
  explanation: string;
}

/**
 * Check whether the output of `source` is compatible with the input of `target`.
 */
export function checkCompatibility(
  source: PlannerContract,
  target: PlannerContract,
): CompatibilityResult {
  const outputMask = formatMask(source.types.output.format);
  const requiredTraits = expandTraits(target.types.input.traits);
  const requiredMask = traitMask(requiredTraits);

  const compatible = isCompatible(outputMask, requiredMask);
  const missing = compatible ? [] : missingTraits(outputMask, requiredMask);

  const explanation = compatible
    ? `Output of "${source.id}" (${source.types.output.format}) satisfies input requirements of "${target.id}".`
    : `Output of "${source.id}" (${source.types.output.format}) is missing traits [${missing.join(', ')}] required by "${target.id}".`;

  return { compatible, missingTraits: missing, explanation };
}

/**
 * Check if a specific format satisfies trait requirements.
 */
export function checkFormatCompatibility(
  format: FormatId,
  requiredTraits: readonly Trait[],
): CompatibilityResult {
  const outputMask = formatMask(format);
  const expanded = expandTraits(requiredTraits);
  const requiredMask = traitMask(expanded);

  const compatible = isCompatible(outputMask, requiredMask);
  const missing = compatible ? [] : missingTraits(outputMask, requiredMask);

  const explanation = compatible
    ? `Format "${format}" satisfies required traits [${requiredTraits.join(', ')}].`
    : `Format "${format}" is missing traits [${missing.join(', ')}] from required [${requiredTraits.join(', ')}].`;

  return { compatible, missingTraits: missing, explanation };
}
