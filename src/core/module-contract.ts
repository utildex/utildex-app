/**
 * ModuleContract — the platform contract for runnable modules.
 *
 * Tools, games, and simulations share this shape.
 */

import { Trait } from './types/traits';
import { FormatId } from './types/formats';
import { I18nText, WidgetCapability } from '../data/types';
import type { AppId } from './app.config';
import type { z } from 'zod';

export interface ModuleContract {
  /** Unique module identifier (matches route and registry key). */
  id: string;

  /** Module metadata sourced from each module's contract. */
  metadata: {
    /** App ownership tag used for app-scoped loading.
     *  - Any AppId: only loaded for that app.
     *  - `'shared'`: loaded for all apps.
     *  - Omitted: inherits the active registry file's default owner. Always set explicitly to avoid surprises. */
    appName?: AppId | 'shared';
    name: I18nText;
    description: I18nText;
    icon: string;
    version: string;
    categories: string[];
    tags: string[];
    featured?: boolean;
    color?: string;
  };

  /** Type contract — describes inputs and outputs for pipeline orchestration. */
  types: {
    input: { traits: readonly Trait[] };
    output: { format: FormatId };
  };

  /** Optional runtime schemas for MCP/pipeline validation. */
  schema?: {
    input: z.ZodTypeAny;
    output: z.ZodTypeAny;
  };

  /**
   * Optional MCP compatibility metadata.
   *
   * Omitted values are resolved from module ownership and kind. Only Utildex
   * tool modules default to MCP-compatible; all other module kinds default to
   * non-compatible and cannot opt in through this flag while MCP is tool-only.
   */
  mcp?: {
    compatible?: boolean;
  };

  /** Widget configuration. */
  widget: WidgetCapability;

  /** Computational cost hint (for future scheduling). */
  cost: 'low' | 'medium' | 'high';
}
