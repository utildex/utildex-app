export type Language = 'en' | 'fr' | 'es' | 'zh';
export type I18nText = string | { [key: string]: string };

export interface WidgetPreset {
  label: I18nText;
  cols: number;
  rows: number;
}

export interface WidgetCapability {
  supported: boolean;
  minCols?: number;
  minRows?: number;
  defaultCols?: number;
  defaultRows?: number;
  presets?: WidgetPreset[];
}

export interface ToolMetadata {
  id: string;
  name: I18nText;
  description: I18nText;
  icon: string;
  version: string;
  categories: string[];
  tags: string[];
  featured?: boolean;
  color?: string;
  routePath?: string;
  widget?: WidgetCapability;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}
