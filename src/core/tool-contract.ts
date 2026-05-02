/**
 * ToolContract — the type definition for tool contracts.
 *
 * Each tool's contract file exports a `contract` constant of this type.
 */

import { Trait } from './types/traits';
import { FormatId } from './types/formats';
import { I18nText, WidgetCapability } from '../data/types';
import type { AppId } from './app.config';
import type { z } from 'zod';

export interface ToolContract {
  /** Unique tool identifier (matches route and registry key). */
  id: string;

  /** Tool metadata sourced from each tool's contract. */
  metadata: {
    /** App ownership tag used for app-scoped loading.
     *  - `'utildex'` / `'synedex'`: only loaded for that app.
     *  - `'shared'`: loaded for both apps.
     *  - Omitted: inherits the registry file's default (`'utildex'` in core-registry.ts,
     *    `'shared'` in core-registry.synedex.ts). Always set explicitly to avoid surprises. */
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
   * `compatible` defaults to `true` when omitted.
   */
  mcp?: {
    compatible?: boolean;
  };

  /** Widget configuration. */
  widget: WidgetCapability;

  /** Computational cost hint (for future scheduling). */
  cost: 'low' | 'medium' | 'high';
}
