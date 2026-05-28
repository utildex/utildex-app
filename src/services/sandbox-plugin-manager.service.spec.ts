import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { SandboxPlugin, SandboxTabEvent } from '../core/sandbox';
import { SandboxPluginManagerService } from './sandbox-plugin-manager.service';

function createTabEvent(): SandboxTabEvent {
  return {
    tab: {
      id: 'tab-1',
      title: 'Terminal 1',
      createdAt: 1,
      sessionId: 'session-1',
      active: true,
    },
    session: {
      id: 'session-1',
      tabId: 'tab-1',
      status: 'ready',
      createdAt: 1,
      startedAt: 1,
      size: { cols: 80, rows: 24 },
    },
  };
}

describe('SandboxPluginManagerService', () => {
  it('registers the internal no-op plugin by default', () => {
    TestBed.configureTestingModule({});

    const service = TestBed.inject(SandboxPluginManagerService);

    expect(service.plugins().map((plugin) => plugin.id)).toContain('simudex-noop-plugin');
  });

  it('rejects plugins that declare hooks without implementations', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SandboxPluginManagerService);
    const plugin: SandboxPlugin = {
      id: 'broken-plugin',
      name: 'Broken Plugin',
      version: '1.0.0',
      hooks: ['onTabCreate'],
    };

    const result = service.register(plugin);

    expect(result.registered).toBe(false);
    expect(result.reason).toContain('without an implementation');
  });

  it('isolates failing plugin hooks and continues running later plugins', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SandboxPluginManagerService);
    const afterFailure = vi.fn();

    service.register({
      id: 'failing-plugin',
      name: 'Failing Plugin',
      version: '1.0.0',
      hooks: ['onTabCreate'],
      onTabCreate: () => {
        throw new Error('plugin exploded');
      },
    });
    service.register({
      id: 'healthy-plugin',
      name: 'Healthy Plugin',
      version: '1.0.0',
      hooks: ['onTabCreate'],
      onTabCreate: afterFailure,
    });

    const records = await service.runTabCreate(
      createTabEvent(),
      service.createContext('test-sandbox', 'test-runtime'),
    );

    expect(afterFailure).toHaveBeenCalledTimes(1);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pluginId: 'failing-plugin', status: 'failed' }),
        expect.objectContaining({ pluginId: 'healthy-plugin', status: 'success' }),
      ]),
    );
    expect(service.invocations().length).toBe(2);
  });
});
