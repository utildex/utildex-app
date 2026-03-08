/**
 * Trait vocabulary for the tool type system.
 *
 * Traits represent semantic capabilities of data formats.
 * They form a hierarchy via implication relationships:
 * e.g. raster → image, vector → image, graph → structured.
 */

export const TRAITS = {
  file: 'file',
  text: 'text',
  binary: 'binary',
  image: 'image',
  raster: 'raster',
  vector: 'vector',
  structured: 'structured',
  graph: 'graph',
  document: 'document',
  audio: 'audio',
  video: 'video',
} as const;

export type Trait = (typeof TRAITS)[keyof typeof TRAITS];

/**
 * Implication relationships between traits.
 * If a format has trait `key`, it also implicitly has traits in `value[]`.
 */
export const TRAIT_IMPLICATIONS: Readonly<Record<string, readonly Trait[]>> = {
  [TRAITS.raster]: [TRAITS.image],
  [TRAITS.vector]: [TRAITS.image],
  [TRAITS.graph]: [TRAITS.structured],
} as const;
