/**
 * Format → trait mapping.
 *
 * Each format declares its direct traits.
 * Implied traits (via TRAIT_IMPLICATIONS) are expanded at runtime by the TypeRegistry.
 */

import { Trait, TRAITS as t } from './traits';

export interface FormatDefinition {
  readonly id: string;
  readonly traits: readonly Trait[];
}

export const FORMATS: Readonly<Record<string, FormatDefinition>> = {
  png: { id: 'png', traits: [t.file, t.binary, t.image, t.raster] },
  jpg: { id: 'jpg', traits: [t.file, t.binary, t.image, t.raster] },
  webp: { id: 'webp', traits: [t.file, t.binary, t.image, t.raster] },
  svg: { id: 'svg', traits: [t.file, t.text, t.image, t.vector] },
  gif: { id: 'gif', traits: [t.file, t.image, t.video] },
  pdf: { id: 'pdf', traits: [t.file, t.binary, t.document] },
  json: { id: 'json', traits: [t.file, t.text, t.structured] },
  text: { id: 'text', traits: [t.file, t.text] },
  dot: { id: 'dot', traits: [t.file, t.text, t.graph] },
} as const;

export type FormatId = keyof typeof FORMATS;
