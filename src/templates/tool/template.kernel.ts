export interface TemplateInput {
  text: string;
}

export interface TemplateResult {
  output: string;
}

/**
 * Example pure transformation used by the template scaffold.
 */
export function transformTemplate(input: TemplateInput): TemplateResult {
  return { output: input.text.trim() };
}

export function run(input: TemplateInput): TemplateResult {
  return transformTemplate(input);
}
