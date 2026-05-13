import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_CONFIG } from '../core/app.config';
import { flushPromises } from '../testing/service-test-helpers';
import { DbService } from './db.service';
import { I18nService } from './i18n.service';
import { ToolService } from './tool.service';

describe('ToolService', () => {
  let db: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        ToolService,
        { provide: DbService, useValue: db },
        {
          provide: I18nService,
          useValue: {
            resolve: (text: string | Record<string, string>) =>
              typeof text === 'string' ? text : text.en || Object.values(text)[0] || '',
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getReadyService(): Promise<ToolService> {
    const service = TestBed.inject(ToolService);
    await vi.waitFor(() => expect(service.tools().length).toBeGreaterThan(0));
    return service;
  }

  it('can be created and loads Utildex tool metadata', async () => {
    const service = await getReadyService();
    const ids = service.tools().map((tool) => tool.id);

    expect(service).toBeTruthy();
    expect(ids).toContain('password-generator');
    expect(ids).toContain('json-formatter');
    expect(ids).not.toContain('sudoku');
  });

  it('toggles favorites and persists the selected ids', async () => {
    const service = await getReadyService();

    service.toggleFavorite('password-generator');

    expect(service.favorites().has('password-generator')).toBe(true);
    expect(db.set).toHaveBeenCalledWith(`${APP_CONFIG.appId}-favorites`, ['password-generator']);

    service.toggleFavorite('password-generator');

    expect(service.favorites().has('password-generator')).toBe(false);
    expect(db.set).toHaveBeenLastCalledWith(`${APP_CONFIG.appId}-favorites`, []);
  });

  it('tracks usage and exposes recent and most-used tools', async () => {
    const now = vi.spyOn(Date, 'now');
    const service = await getReadyService();

    now.mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(3000);
    service.trackToolUsage('json-formatter');
    service.trackToolUsage('password-generator');
    service.trackToolUsage('json-formatter');

    expect(service.usageStats()['json-formatter']).toEqual({ count: 2, lastUsed: 3000 });
    expect(service.historyTools()[0]?.id).toBe('json-formatter');
    expect(service.mostUsedTools()[0]?.id).toBe('json-formatter');
    expect(db.set).toHaveBeenLastCalledWith(
      `${APP_CONFIG.appId}-usage`,
      expect.objectContaining({ 'json-formatter': { count: 2, lastUsed: 3000 } }),
    );
  });

  it('filters by search text, category, and tag', async () => {
    const service = await getReadyService();

    service.setSearch('password');
    expect(service.filteredTools().map((tool) => tool.id)).toContain('password-generator');

    service.resetFilters();
    service.setCategory('Developer');
    expect(service.filteredTools().every((tool) => tool.categories.includes('Developer'))).toBe(
      true,
    );

    service.resetFilters();
    service.toggleTag('json');
    expect(service.filteredTools().map((tool) => tool.id)).toContain('json-formatter');
    expect(service.filteredTools().every((tool) => tool.tags.includes('json'))).toBe(true);
  });

  it('sorts by popularity when usage stats are present', async () => {
    const service = await getReadyService();

    service.usageStats.set({
      'json-formatter': { count: 10, lastUsed: 1000 },
      'password-generator': { count: 2, lastUsed: 2000 },
    });
    service.setSearch('');
    service.setSort('popularity');

    expect(service.filteredTools()[0]?.id).toBe('json-formatter');
  });

  it('handles unknown tool ids safely', async () => {
    const service = await getReadyService();

    await expect(service.getContract('missing-tool')).resolves.toBeNull();
    expect(service.hasContract('missing-tool')).toBe(false);
    expect(service.getLastUsedDate('missing-tool')).toBeNull();
  });

  it('hydrates saved favorites, usage, and dashboard widgets', async () => {
    db.get.mockImplementation((key: string) => {
      if (key.endsWith('-favorites')) return Promise.resolve(['json-formatter']);
      if (key.endsWith('-usage')) {
        return Promise.resolve({ 'json-formatter': { count: 3, lastUsed: 5000 } });
      }
      if (key.endsWith('-dashboard-v2')) {
        return Promise.resolve([
          {
            instanceId: 'widget-1',
            type: 'tool',
            toolId: 'json-formatter',
            layout: { x: 0, y: 0, w: 2, h: 2 },
          },
        ]);
      }
      return Promise.resolve(undefined);
    });

    const service = TestBed.inject(ToolService);
    await flushPromises();

    expect(service.favorites().has('json-formatter')).toBe(true);
    expect(service.usageStats()['json-formatter']).toEqual({ count: 3, lastUsed: 5000 });
    expect(service.dashboardWidgets()).toHaveLength(1);
  });
});
