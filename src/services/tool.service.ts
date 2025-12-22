import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { I18nService, I18nText } from './i18n.service';

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
  routePath: string;
  widget?: WidgetCapability;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  instanceId: string;
  type: 'tool' | 'note' | 'image' | 'spacer';
  toolId?: string; // Required if type === 'tool'
  data?: Record<string, any>; // Content for notes, url for images, etc.
  layout: WidgetLayout;
}

interface ToolUsageStats {
  [toolId: string]: {
    count: number;
    lastUsed: number; // timestamp
  };
}

const CATEGORY_TRANSLATIONS: Record<string, I18nText> = {
  'Utility': { en: 'Utility', fr: 'Utilitaire', es: 'Utilidad', zh: '实用工具' },
  'Security': { en: 'Security', fr: 'Sécurité', es: 'Seguridad', zh: '安全' },
  'Developer': { en: 'Developer', fr: 'Développeur', es: 'Desarrollador', zh: '开发者' },
  'Office': { en: 'Office', fr: 'Bureautique', es: 'Oficina', zh: '办公' },
  'Media': { en: 'Media', fr: 'Média', es: 'Multimedia', zh: '媒体' },
  'Design': { en: 'Design', fr: 'Design', es: 'Diseño', zh: '设计' }
};

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  private i18n = inject(I18nService);

  // Hardcoded registry
  private readonly toolsRegistry: ToolMetadata[] = [
    {
      "id": "lorem-ipsum",
      "name": { 
        "en": "Lorem Ipsum", 
        "fr": "Lorem Ipsum",
        "es": "Lorem Ipsum",
        "zh": "Lorem Ipsum"
      },
      "description": { 
        "en": "Generate placeholder text for your designs with adjustable paragraph counts.", 
        "fr": "Générez du texte de remplissage pour vos designs avec un nombre de paragraphes ajustable.",
        "es": "Genere texto de relleno para sus diseños con un recuento de párrafos ajustable.",
        "zh": "生成带有可调节段落数量的占位符文本，用于您的设计。"
      },
      "icon": "description",
      "version": "1.0.0",
      "categories": ["Utility"],
      "tags": ["generator", "text", "lorem", "ipsum"],
      "color": "#3b82f6",
      "routePath": "tools/lorem-ipsum",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 1,
        "presets": [
          { "label": { "en": "Default", "fr": "Défaut", "es": "Por defecto", "zh": "默认" }, "cols": 2, "rows": 1 }
        ]
      }
    },
    {
      "id": "password-generator",
      "name": {
        "en": "Password Generator",
        "fr": "Générateur de Mots de Passe",
        "es": "Generador de Contraseñas",
        "zh": "密码生成器"
      },
      "description": {
        "en": "Create secure, random passwords with customizable length and character sets.",
        "fr": "Créez des mots de passe aléatoires et sécurisés avec une longueur et des jeux de caractères personnalisables.",
        "es": "Cree contraseñas seguras y aleatorias con longitud y juegos de caracteres personalizables.",
        "zh": "创建安全、随机的密码，支持自定义长度和字符集。"
      },
      "icon": "key",
      "version": "1.1.0",
      "categories": ["Utility", "Security"],
      "tags": ["security", "password", "random"],
      "featured": true,
      "color": "#10b981",
      "routePath": "tools/password-generator",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 1,
        "presets": [
          { "label": { "en": "Standard", "fr": "Standard", "es": "Estándar", "zh": "标准" }, "cols": 2, "rows": 1 },
          { "label": { "en": "Compact", "fr": "Compact", "es": "Compacto", "zh": "紧凑" }, "cols": 1, "rows": 1 }
        ]
      }
    },
    {
      "id": "markdown-preview",
      "name": {
        "en": "Markdown Preview",
        "fr": "Aperçu Markdown",
        "es": "Vista previa Markdown",
        "zh": "Markdown 预览"
      },
      "description": {
        "en": "Live editor to write and preview Markdown formatted text instantly.",
        "fr": "Éditeur en direct pour écrire et prévisualiser instantanément du texte formaté en Markdown.",
        "es": "Editor en vivo para escribir y previsualizar texto formateado en Markdown al instante.",
        "zh": "即时编写和预览 Markdown 格式文本的实时编辑器。"
      },
      "icon": "markdown",
      "version": "1.0.0",
      "categories": ["Developer"],
      "tags": ["developer", "markdown", "editor", "preview"],
      "featured": true,
      "color": "#f59e0b",
      "routePath": "tools/markdown-preview",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2
      }
    },
    {
      "id": "json-formatter",
      "name": {
        "en": "JSON Formatter",
        "fr": "Formateur JSON",
        "es": "Formateador JSON",
        "zh": "JSON 格式化"
      },
      "description": {
        "en": "Validate, format, and minify JSON data. Supports file drag and drop.",
        "fr": "Validez, formatez et minifiez les données JSON. Supporte le glisser-déposer.",
        "es": "Valida, formatea y minimiza datos JSON. Soporta arrastrar y soltar.",
        "zh": "验证、格式化和压缩 JSON 数据。支持文件拖放。"
      },
      "icon": "data_object",
      "version": "1.0.0",
      "categories": ["Developer"],
      "tags": ["json", "format", "prettify", "minify", "developer"],
      "featured": false,
      "color": "#8b5cf6",
      "routePath": "tools/json-formatter",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2
      }
    },
    {
      "id": "unit-converter",
      "name": {
        "en": "Unit Converter",
        "fr": "Convertisseur d'unités",
        "es": "Convertidor de Unidades",
        "zh": "单位转换器"
      },
      "description": {
        "en": "Convert between common units of length, weight, and temperature.",
        "fr": "Convertissez entre les unités courantes de longueur, de poids et de température.",
        "es": "Convierta entre unidades comunes de longitud, peso y temperatura.",
        "zh": "在长度、重量和温度的常用单位之间进行转换。"
      },
      "icon": "scale",
      "version": "1.0.0",
      "categories": ["Utility", "Office"],
      "tags": ["converter", "unit", "length", "weight", "temperature"],
      "featured": false,
      "color": "#f43f5e",
      "routePath": "tools/unit-converter",
      "widget": {
        "supported": true,
        "defaultCols": 1,
        "defaultRows": 2
      }
    }
  ];

  // Core State
  readonly tools = signal<ToolMetadata[]>(this.toolsRegistry);
  favorites = signal<Set<string>>(new Set<string>());
  usageStats = signal<ToolUsageStats>({});
  
  // Dashboard State
  dashboardWidgets = signal<DashboardWidget[]>([]);
  
  // Search/Filter State
  searchQuery = signal<string>('');
  selectedTags = signal<Set<string>>(new Set<string>());
  selectedCategory = signal<string | null>(null);
  sortOrder = signal<'name' | 'newest'>('name');

  constructor() {
    this.loadFavorites();
    this.loadUsageStats();
    this.loadDashboard();
  }

  // ... (Previous computed properties and basic actions same as before)
  categories = computed(() => {
    const allCats = this.tools().flatMap(t => t.categories);
    return [...new Set(allCats)].sort();
  });

  allTags = computed(() => {
    const tags = this.tools().flatMap(t => t.tags);
    return [...new Set(tags)].sort();
  });

  filteredTools = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const tags = this.selectedTags();
    const allTools = this.tools();

    let filtered = allTools.filter(tool => {
      const matchesSearch = 
        !query ||
        this.resolveSearchText(tool.name).includes(query) || 
        this.resolveSearchText(tool.description).includes(query);
      const matchesCategory = category ? tool.categories.includes(category) : true;
      const matchesTags = tags.size === 0 || tool.tags.some(tag => tags.has(tag));
      return matchesSearch && matchesCategory && matchesTags;
    });

    if (this.sortOrder() === 'name') {
      filtered.sort((a, b) => this.i18n.resolve(a.name).localeCompare(this.i18n.resolve(b.name)));
    }
    return filtered;
  });

  featuredTools = computed(() => this.tools().filter(t => t.featured));
  favoriteTools = computed(() => {
    const favIds = this.favorites();
    return this.tools().filter(t => favIds.has(t.id));
  });
  mostUsedTools = computed(() => {
    const stats = this.usageStats();
    const usedTools = this.tools().filter(t => stats[t.id]?.count > 0);
    return usedTools.sort((a, b) => (stats[b.id].count || 0) - (stats[a.id].count || 0)).slice(0, 5);
  });
  historyTools = computed(() => {
    const stats = this.usageStats();
    const usedTools = this.tools().filter(t => stats[t.id]?.lastUsed > 0);
    return usedTools.sort((a, b) => (stats[b.id].lastUsed || 0) - (stats[a.id].lastUsed || 0));
  });

  trackToolUsage(toolId: string) {
    this.usageStats.update(current => {
      const stats = current[toolId] || { count: 0, lastUsed: 0 };
      const updated = { ...current, [toolId]: { count: stats.count + 1, lastUsed: Date.now() } };
      this.persistUsageStats(updated);
      return updated;
    });
  }

  toggleFavorite(toolId: string) {
    this.favorites.update(favs => {
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
    this.selectedTags.update(tags => {
      const newTags = new Set<string>(tags);
      if (newTags.has(tag)) newTags.delete(tag);
      else newTags.add(tag);
      return newTags;
    });
  }

  setCategory(category: string | null) { this.selectedCategory.set(category); }
  setSearch(query: string) { this.searchQuery.set(query); }
  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set(null);
    this.selectedTags.set(new Set<string>());
  }

  getToolsByCategory(category: string) { return this.tools().filter(t => t.categories.includes(category)); }
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
  isPositionValid(x: number, y: number, w: number, h: number, existingWidgets: DashboardWidget[], ignoreId?: string): boolean {
    // Basic bounds check (if we had a fixed height, but we have infinite scroll)
    if (x < 0 || y < 0) return false;

    // Check collision with every other widget
    for (const widget of existingWidgets) {
      if (widget.instanceId === ignoreId) continue;

      const wl = widget.layout;
      
      // Standard AABB collision check
      const overlaps = (
        x < wl.x + wl.w &&
        x + w > wl.x &&
        y < wl.y + wl.h &&
        y + h > wl.y
      );

      if (overlaps) return false;
    }

    return true;
  }

  placeWidget(widget: DashboardWidget) {
    this.dashboardWidgets.update(current => {
      const updated = [...current, widget];
      this.persistDashboard(updated);
      return updated;
    });
  }

  updateWidgetData(instanceId: string, data: any) {
    this.dashboardWidgets.update(widgets => {
       const updated = widgets.map(w =>
         w.instanceId === instanceId
           ? { ...w, data: { ...w.data, ...data } }
           : w
       );
       this.persistDashboard(updated);
       return updated;
    });
  }

  removeWidget(instanceId: string) {
    this.dashboardWidgets.update(widgets => {
      const updated = widgets.filter(w => w.instanceId !== instanceId);
      this.persistDashboard(updated);
      return updated;
    });
  }

  // --- Persistence ---
  private loadFavorites() {
    const saved = localStorage.getItem('utildex-favorites');
    if (saved) { try { this.favorites.set(new Set<string>(JSON.parse(saved) as string[])); } catch (e) {} }
  }
  private persistFavorites(favs: Set<string>) { localStorage.setItem('utildex-favorites', JSON.stringify([...favs])); }
  private loadUsageStats() {
    const saved = localStorage.getItem('utildex-usage');
    if (saved) { try { this.usageStats.set(JSON.parse(saved)); } catch (e) {} }
  }
  private persistUsageStats(stats: ToolUsageStats) { localStorage.setItem('utildex-usage', JSON.stringify(stats)); }
  private loadDashboard() {
    const saved = localStorage.getItem('utildex-dashboard-v2');
    if (saved) { try { this.dashboardWidgets.set(JSON.parse(saved)); } catch (e) {} }
  }
  private persistDashboard(items: DashboardWidget[]) { localStorage.setItem('utildex-dashboard-v2', JSON.stringify(items)); }
  private resolveSearchText(text: I18nText): string {
    if (typeof text === 'string') return text.toLowerCase();
    return Object.values(text).join(' ').toLowerCase();
  }
}