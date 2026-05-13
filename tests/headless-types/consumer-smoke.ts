import {
  callHeadlessTool,
  getHeadlessTool,
  listHeadlessTools,
  type CallHeadlessToolOptions,
  type HeadlessToolDefinition,
  type HeadlessToolSpacesOptions,
  type HeadlessToolSummary,
  type ListHeadlessToolsOptions,
} from 'utildex/headless';

const listOptions: ListHeadlessToolsOptions = { mcpCompatibleOnly: true };
const callOptions: CallHeadlessToolOptions = {
  validateInput: true,
  validateOutput: true,
  requireMcpCompatible: true,
};
const spaceOptions: HeadlessToolSpacesOptions = { mcpCompatibleOnly: false };

async function smokeConsumerTypes(): Promise<void> {
  const summaries: HeadlessToolSummary[] = await listHeadlessTools(listOptions);
  const firstSummary: HeadlessToolSummary | undefined = summaries[0];

  if (!firstSummary) {
    return;
  }

  const definition: HeadlessToolDefinition = await getHeadlessTool(firstSummary.id);
  const output: unknown = await callHeadlessTool(definition.id, {}, callOptions);
  const maybeSchema = definition.schema;
  const acceptsSpaceOptions: HeadlessToolSpacesOptions = spaceOptions;

  void output;
  void maybeSchema;
  void acceptsSpaceOptions;
}

void smokeConsumerTypes;
