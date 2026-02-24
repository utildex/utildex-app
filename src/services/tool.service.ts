import { Injectable, signal, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { DbService } from './db.service';
import { TOOL_REGISTRY } from '../data/tool-registry';
import {
  I18nText,
  WidgetPreset,
  WidgetCapability,
  ToolMetadata,
  WidgetLayout,
} from '../data/types';

// Export types so they can be imported from ToolService
export type { I18nText, WidgetPreset, WidgetCapability, ToolMetadata, WidgetLayout };

export interface DashboardWidget {
  instanceId: string;
  type: 'tool' | 'note' | 'image' | 'spacer';
  toolId?: string; // Required if type === 'tool'
  data?: Record<string, unknown>; // Content for notes, url for images, etc.
  layout: WidgetLayout;
}

// Defines what we are currently trying to place
export interface PendingPlacement {
  type: DashboardWidget['type'];
  toolId?: string;
  w: number;
  h: number;
  data?: Record<string, unknown>;
}

interface ToolUsageStats {
  [toolId: string]: {
    count: number;
    lastUsed: number; // timestamp
  };
}

const CATEGORY_TRANSLATIONS: Record<string, I18nText> = {
  Utility: { en: 'Utility', fr: 'Utilitaire', es: 'Utilidad', zh: '实用工具' },
  Security: { en: 'Security', fr: 'Sécurité', es: 'Seguridad', zh: '安全' },
  Developer: { en: 'Developer', fr: 'Développeur', es: 'Desarrollador', zh: '开发者' },
  Office: { en: 'Office', fr: 'Bureautique', es: 'Oficina', zh: '办公' },
  Media: { en: 'Media', fr: 'Média', es: 'Multimedia', zh: '媒体' },
  Design: { en: 'Design', fr: 'Design', es: 'Diseño', zh: '设计' },
};

@Injectable({
  providedIn: 'root',
})
export class ToolService {
  private i18n = inject(I18nService);
  private db = inject(DbService);

  // Dynamically attach route paths based on ID
  private readonly toolsRegistry: ToolMetadata[] = TOOL_REGISTRY.map((t) => ({
    ...t,
    routePath: `tools/${t.id}`,
  }));

  // Core State
  readonly tools = signal<ToolMetadata[]>(this.toolsRegistry);
  favorites = signal<Set<string>>(new Set<string>());
  usageStats = signal<ToolUsageStats>({});

  // Dashboard State
  dashboardWidgets = signal<DashboardWidget[]>([]);

  // Modal State (Global placement to solve z-index issues)
  addModalOpen = signal(false);
  fillerModalOpen = signal(false);
  placementRequest = signal<PendingPlacement | null>(null);

  // Search/Filter State
  searchQuery = signal<string>('');
  selectedTags = signal<Set<string>>(new Set<string>());
  selectedCategory = signal<string | null>(null);
  sortOrder = signal<'name' | 'relevance' | 'popularity' | 'newest'>('name');

  constructor() {
    this.loadFavorites();
    this.loadUsageStats();
    this.loadDashboard();
  }

  // ... (Computed properties unchanged)
  categories = computed(() => {
    const allCats = this.tools().flatMap((t) => t.categories);
    return [...new Set(allCats)].sort();
  });

  allTags = computed(() => {
    const tags = this.tools().flatMap((t) => t.tags);
    return [...new Set(tags)].sort();
  });

  filteredTools = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const tags = this.selectedTags();
    const allTools = this.tools();
    const order = this.sortOrder();
    const stats = this.usageStats(); // For popularity sort

    // 1. Filter
    let filtered = allTools.filter((tool) => {
      const matchesSearch =
        !query ||
        this.resolveSearchText(tool.name).includes(query) ||
        this.resolveSearchText(tool.description).includes(query);
      const matchesCategory = category ? tool.categories.includes(category) : true;
      const matchesTags = tags.size === 0 || tool.tags.some((tag) => tags.has(tag));
      return matchesSearch && matchesCategory && matchesTags;
    });

    // 2. Score (if needed for relevance) or Default Sort
    if (order === 'relevance' && query.length > 1) {
      filtered = filtered
        .map((tool) => {
          const name = this.resolveSearchText(tool.name).toLowerCase();
          const tagsJoined = tool.tags.join(' ');
          const desc = this.resolveSearchText(tool.description).toLowerCase();

          let score = 0;
          if (name.startsWith(query)) score += 100;
          else if (name.includes(query)) score += 10;
          if (tagsJoined.includes(query)) score += 5;
          if (desc.includes(query)) score += 1;

          return { tool, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.tool);
    } else if (order === 'popularity') {
      filtered.sort((a, b) => (stats[b.id]?.count || 0) - (stats[a.id]?.count || 0));
    } else if (order === 'name') {
      filtered.sort((a, b) => this.i18n.resolve(a.name).localeCompare(this.i18n.resolve(b.name)));
    }

    // Fallback if relevance is selected but query is empty or short -> default to Name
    if (order === 'relevance' && query.length <= 1) {
      filtered.sort((a, b) => this.i18n.resolve(a.name).localeCompare(this.i18n.resolve(b.name)));
    }

    return filtered;
  });

  featuredTools = computed(() => this.tools().filter((t) => t.featured));
  favoriteTools = computed(() => {
    const favIds = this.favorites();
    return this.tools().filter((t) => favIds.has(t.id));
  });
  mostUsedTools = computed(() => {
    const stats = this.usageStats();
    const usedTools = this.tools().filter((t) => stats[t.id]?.count > 0);
    return usedTools
      .sort((a, b) => (stats[b.id].count || 0) - (stats[a.id].count || 0))
      .slice(0, 5);
  });
  historyTools = computed(() => {
    const stats = this.usageStats();
    const usedTools = this.tools().filter((t) => stats[t.id]?.lastUsed > 0);
    return usedTools.sort((a, b) => (stats[b.id].lastUsed || 0) - (stats[a.id].lastUsed || 0));
  });

  // --- Modal Actions ---
  openAddToolModal() {
    this.addModalOpen.set(true);
  }
  openFillerModal() {
    this.fillerModalOpen.set(true);
  }
  closeModals() {
    this.addModalOpen.set(false);
    this.fillerModalOpen.set(false);
  }

  // Called by the modal when user makes a selection
  requestPlacement(p: PendingPlacement) {
    this.closeModals();
    this.placementRequest.set(p);
  }

  // Called by Dashboard to consume the event
  consumePlacementRequest(): PendingPlacement | null {
    const p = this.placementRequest();
    this.placementRequest.set(null);
    return p;
  }

  trackToolUsage(toolId: string) {
    this.usageStats.update((current) => {
      const stats = current[toolId] || { count: 0, lastUsed: 0 };
      const updated = { ...current, [toolId]: { count: stats.count + 1, lastUsed: Date.now() } };
      this.persistUsageStats(updated);
      return updated;
    });
  }

  toggleFavorite(toolId: string) {
    this.favorites.update((favs) => {
      const newFavs = new Set<string>(favs);
      if (newFavs.has(toolId)) newFavs.delete(toolId);
      else newFavs.add(toolId);
      this.persistFavorites(newFavs);
      return newFavs;
    });
  }

  // --- Reset Methods ---
  resetUsage() {
    this.usageStats.set({});
    this.persistUsageStats({});
  }

  resetFavorites() {
    this.favorites.set(new Set());
    this.persistFavorites(new Set());
  }

  resetDashboard() {
    this.dashboardWidgets.set([]);
    this.persistDashboard([]);
  }

  toggleTag(tag: string) {
    this.selectedTags.update((tags) => {
      const newTags = new Set<string>(tags);
      if (newTags.has(tag)) newTags.delete(tag);
      else newTags.add(tag);
      return newTags;
    });
  }

  setCategory(category: string | null) {
    this.selectedCategory.set(category);
  }
  setSort(order: 'name' | 'newest' | 'relevance' | 'popularity') {
    this.sortOrder.set(order);
  }
  setSearch(query: string) {
    this.searchQuery.set(query);
  }
  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set(null);
    this.selectedTags.set(new Set<string>());
    this.sortOrder.set('name');
  }

  getToolsByCategory(category: string) {
    return this.tools().filter((t) => t.categories.includes(category));
  }
  getLastUsedDate(toolId: string): Date | null {
    const timestamp = this.usageStats()[toolId]?.lastUsed;
    return timestamp ? new Date(timestamp) : null;
  }
  getCategoryName(id: string): string {
    const label = CATEGORY_TRANSLATIONS[id];
    return label ? this.i18n.resolve(label) : id;
  }

  // --- Grid Logic ---

  /**
   * Checks if a rectangle overlaps with any existing widget.
   */
  isPositionValid(
    x: number,
    y: number,
    w: number,
    h: number,
    existingWidgets: DashboardWidget[],
    maxCols?: number,
    ignoreId?: string,
  ): boolean {
    if (x < 0 || y < 0) return false;
    if (maxCols !== undefined && x + w > maxCols) return false;

    for (const widget of existingWidgets) {
      if (widget.instanceId === ignoreId) continue;
      const wl = widget.layout;
      const overlaps = x < wl.x + wl.w && x + w > wl.x && y < wl.y + wl.h && y + h > wl.y;
      if (overlaps) return false;
    }
    return true;
  }

  placeWidget(widget: DashboardWidget) {
    this.dashboardWidgets.update((current) => {
      const updated = [...current, widget];
      this.persistDashboard(updated);
      return updated;
    });
  }

  updateWidgetData(instanceId: string, data: Record<string, unknown>) {
    this.dashboardWidgets.update((widgets) => {
      const updated = widgets.map((w) =>
        w.instanceId === instanceId ? { ...w, data: { ...w.data, ...data } } : w,
      );
      this.persistDashboard(updated);
      return updated;
    });
  }

  removeWidget(instanceId: string) {
    this.dashboardWidgets.update((widgets) => {
      const updated = widgets.filter((w) => w.instanceId !== instanceId);
      this.persistDashboard(updated);
      return updated;
    });
  }

  // --- Persistence (Async) ---
  private async loadFavorites() {
    try {
      const saved = await this.db.get<string[]>('utildex-favorites');
      if (saved) this.favorites.set(new Set<string>(saved));
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  }

  private persistFavorites(favs: Set<string>) {
    this.db.set('utildex-favorites', [...favs]);
  }

  private async loadUsageStats() {
    try {
      const saved = await this.db.get<ToolUsageStats>('utildex-usage');
      if (saved) this.usageStats.set(saved);
    } catch (e) {
      console.warn('Failed to load usage', e);
    }
  }

  private persistUsageStats(stats: ToolUsageStats) {
    this.db.set('utildex-usage', stats);
  }

  private async loadDashboard() {
    try {
      const saved = await this.db.get<DashboardWidget[]>('utildex-dashboard-v2');
      if (saved) this.dashboardWidgets.set(saved);
    } catch (e) {
      console.warn('Failed to load dashboard', e);
    }
  }

  private persistDashboard(items: DashboardWidget[]) {
    this.db.set('utildex-dashboard-v2', items);
  }

  private resolveSearchText(text: I18nText): string {
    if (typeof text === 'string') return text.toLowerCase();
    return Object.values(text).join(' ').toLowerCase();
  }
}
