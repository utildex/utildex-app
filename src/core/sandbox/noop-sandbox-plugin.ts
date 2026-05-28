import type { SandboxPlugin } from './sandbox-plugin.contract';

export const noopSandboxPlugin: SandboxPlugin = {
  id: 'simudex-noop-plugin',
  name: 'Simudex No-op Plugin',
  version: '1.0.0',
  description: 'Internal placeholder plugin used to validate the sandbox plugin host.',
  hooks: [],
};
