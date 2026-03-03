export type DataType = 'text' | 'json' | 'blob' | 'number' | 'boolean' | 'any';

export interface Port {
  id: string;
  label: string;
  type: DataType;
  format?: string | string[];
  array?: boolean;
  required?: boolean;
}

export interface ProcessorContext {
  signal: AbortSignal;
  reportProgress: (percent: number) => void;
}

export type Processor = (
  inputs: Record<string, unknown>,
  config: Record<string, unknown>,
  context: ProcessorContext,
) => Promise<Record<string, unknown>>;

export interface NodeDefinition {
  toolId: string;
  inputs: Port[];
  outputs: Port[];
  loadProcessor: () => Promise<Processor>;
}
