
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { I18nService, I18nText } from './i18n.service';
import { DbService } from './db.service';

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

// Defines what we are currently trying to place
export interface PendingPlacement {
  type: DashboardWidget['type'];
  toolId?: string;
  w: number;
  h: number;
  data?: any;
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
  private db = inject(DbService);

  // Registry defined without explicit routePath (it will be generated)
  private readonly rawRegistry: Omit<ToolMetadata, 'routePath'>[] = [
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
      "id": "qr-studio",
      "name": { 
        "en": "QR Code Studio", 
        "fr": "Studio QR Code", 
        "es": "Estudio Código QR",
        "zh": "二维码工作室"
      },
      "description": { 
        "en": "Generate static, private QR codes for URLs, WiFi, and text. No tracking, never expires.", 
        "fr": "Générez des QR codes statiques et privés pour URL, WiFi et texte. Pas de suivi, n'expire jamais.",
        "es": "Genere códigos QR estáticos y privados. Sin rastreo, nunca caducan.",
        "zh": "生成用于 URL、WiFi 和文本的静态隐私二维码。无跟踪，永不过期。"
      },
      "icon": "qr_code_2",
      "version": "1.0.0",
      "categories": ["Utility", "Design", "Office"],
      "tags": ["qr", "code", "generator", "wifi", "2d", "barcode"],
      "color": "#0ea5e9",
      "featured": true,
      "widget": {
        "supported": true,
        "defaultCols": 1,
        "defaultRows": 1,
        "presets": [
          { "label": { "en": "Small", "fr": "Petit", "es": "Pequeño", "zh": "小" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Wide", "fr": "Large", "es": "Ancho", "zh": "宽" }, "cols": 2, "rows": 1 },
          { "label": { "en": "Large", "fr": "Grand", "es": "Grande", "zh": "大" }, "cols": 2, "rows": 2 }
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
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2
      }
    },
    {
      "id": "diff-checker",
      "name": { 
        "en": "Diff Checker", 
        "fr": "Comparateur de Texte",
        "es": "Comparador de Texto",
        "zh": "文本差异对比"
      },
      "description": { 
        "en": "Compare text or code to find differences. Runs locally for privacy.", 
        "fr": "Comparez du texte ou du code pour trouver les différences. Fonctionne localement pour la confidentialité.",
        "es": "Compare texto o código para encontrar diferencias. Ejecución local para privacidad.",
        "zh": "对比文本或代码以查找差异。本地运行，保护隐私。"
      },
      "icon": "difference",
      "version": "1.0.0",
      "categories": ["Developer", "Office"],
      "tags": ["diff", "compare", "code", "text", "check"],
      "color": "#6366f1",
      "widget": {
        "supported": true,
        "defaultCols": 3,
        "defaultRows": 1,
        "presets": [
          { "label": { "en": "Wide Compare", "fr": "Large", "es": "Ancho", "zh": "宽屏对比" }, "cols": 3, "rows": 1 },
          { "label": { "en": "Mini Editor", "fr": "Mini Éditeur", "es": "Mini Editor", "zh": "迷你编辑器" }, "cols": 2, "rows": 2 }
        ]
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
      "widget": {
        "supported": true,
        "defaultCols": 1,
        "defaultRows": 2
      }
    },
    {
      "id": "image-converter",
      "name": { 
        "en": "Image Converter", 
        "fr": "Convertisseur Image",
        "es": "Convertidor de Imagen",
        "zh": "图片转换器"
      },
      "description": { 
        "en": "Batch convert images (JPG, PNG, WEBP, HEIC) locally. Resize and compress securely.", 
        "fr": "Convertissez des images (JPG, PNG, WEBP, HEIC) localement par lots. Redimensionnez et compressez en toute sécurité.",
        "es": "Convierta imágenes (JPG, PNG, WEBP, HEIC) localmente por lotes. Redimensione y comprima de forma segura.",
        "zh": "本地批量转换图片（JPG, PNG, WEBP, HEIC）。安全地调整大小和压缩。"
      },
      "icon": "photo_library",
      "version": "1.0.0",
      "categories": ["Media", "Utility"],
      "tags": ["image", "converter", "heic", "webp", "jpg", "png", "compression"],
      "color": "#ec4899",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Icon", "fr": "Icône", "es": "Icono", "zh": "图标" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Standard", "fr": "Standard", "es": "Estándar", "zh": "标准" }, "cols": 2, "rows": 2 }
        ]
      }
    },
    {
      "id": "split-pdf",
      "name": { 
        "en": "Split PDF", 
        "fr": "Diviser PDF",
        "es": "Dividir PDF",
        "zh": "拆分 PDF"
      },
      "description": { 
        "en": "Extract specific pages from a PDF document. Processed 100% locally.", 
        "fr": "Extrayez des pages spécifiques d'un document PDF. Traité 100% localement.",
        "es": "Extraiga páginas específicas de un documento PDF. Procesado 100% localmente.",
        "zh": "从 PDF 文档中提取特定页面。100% 本地处理。"
      },
      "icon": "picture_as_pdf",
      "version": "1.0.0",
      "categories": ["Office", "Utility"],
      "tags": ["pdf", "split", "extract", "pages", "document"],
      "color": "#ef4444",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Icon", "fr": "Icône", "es": "Icono", "zh": "图标" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Wide", "fr": "Large", "es": "Ancho", "zh": "宽" }, "cols": 2, "rows": 1 },
          { "label": { "en": "Tall", "fr": "Haut", "es": "Alto", "zh": "高" }, "cols": 1, "rows": 2 },
          { "label": { "en": "Large", "fr": "Grand", "es": "Grande", "zh": "大" }, "cols": 2, "rows": 2 }
        ]
      }
    },
    {
      "id": "merge-pdf",
      "name": { 
        "en": "Merge PDF", 
        "fr": "Fusionner PDF",
        "es": "Unir PDF",
        "zh": "合并 PDF"
      },
      "description": { 
        "en": "Combine multiple PDF files into a single document. Reorder easily.", 
        "fr": "Combinez plusieurs fichiers PDF en un seul document. Réorganisez facilement.",
        "es": "Combine múltiples archivos PDF en un solo documento. Reordene fácilmente.",
        "zh": "将多个 PDF 文件合并为一个文档。轻松重新排序。"
      },
      "icon": "join_full",
      "version": "1.0.0",
      "categories": ["Office", "Utility"],
      "tags": ["pdf", "merge", "combine", "join", "document"],
      "color": "#8b5cf6",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Icon", "fr": "Icône", "es": "Icono", "zh": "图标" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Wide", "fr": "Large", "es": "Ancho", "zh": "宽" }, "cols": 2, "rows": 1 },
          { "label": { "en": "Tall", "fr": "Haut", "es": "Alto", "zh": "高" }, "cols": 1, "rows": 2 },
          { "label": { "en": "Large", "fr": "Grand", "es": "Grande", "zh": "大" }, "cols": 2, "rows": 2 }
        ]
      }
    },
    {
      "id": "img-to-pdf",
      "name": { 
        "en": "Images to PDF", 
        "fr": "Images en PDF",
        "es": "Imágenes a PDF",
        "zh": "图片转 PDF"
      },
      "description": { 
        "en": "Convert PNG, JPG, or WEBP images into a single PDF document.", 
        "fr": "Convertissez des images PNG, JPG ou WEBP en un seul document PDF.",
        "es": "Convierta imágenes PNG, JPG o WEBP en un solo documento PDF.",
        "zh": "将 PNG、JPG 或 WEBP 图片转换为单个 PDF 文档。"
      },
      "icon": "picture_as_pdf",
      "version": "1.0.0",
      "categories": ["Office", "Media"],
      "tags": ["pdf", "image", "convert", "jpg", "png"],
      "color": "#ec4899",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Icon", "fr": "Icône", "es": "Icono", "zh": "图标" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Wide", "fr": "Large", "es": "Ancho", "zh": "宽" }, "cols": 2, "rows": 1 },
          { "label": { "en": "Tall", "fr": "Haut", "es": "Alto", "zh": "高" }, "cols": 1, "rows": 2 },
          { "label": { "en": "Large", "fr": "Grand", "es": "Grande", "zh": "大" }, "cols": 2, "rows": 2 }
        ]
      }
    },
    {
      "id": "rotate-pdf",
      "name": { 
        "en": "Rotate PDF", 
        "fr": "Pivoter PDF",
        "es": "Rotar PDF",
        "zh": "旋转 PDF"
      },
      "description": { 
        "en": "Rotate all or selected pages of a PDF document permanently.", 
        "fr": "Faites pivoter toutes ou certaines pages d'un document PDF de façon permanente.",
        "es": "Rote todas o las páginas seleccionadas de un documento PDF permanentemente.",
        "zh": "永久旋转 PDF 文档的所有或选定页面。"
      },
      "icon": "rotate_right",
      "version": "1.0.0",
      "categories": ["Office", "Utility"],
      "tags": ["pdf", "rotate", "turn", "orientation", "document"],
      "color": "#f59e0b",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 1
      }
    },
    {
      "id": "pdf-to-img",
      "name": { 
        "en": "PDF to Image", 
        "fr": "PDF en Image",
        "es": "PDF a Imagen",
        "zh": "PDF 转图片"
      },
      "description": { 
        "en": "Convert PDF pages to JPG, PNG, or WebP images. High resolution supported.", 
        "fr": "Convertissez des pages PDF en images JPG, PNG ou WebP. Haute résolution supportée.",
        "es": "Convierta páginas PDF a imágenes JPG, PNG o WebP. Alta resolución soportada.",
        "zh": "将 PDF 页面转换为 JPG、PNG 或 WebP 图片。支持高分辨率。"
      },
      "icon": "image",
      "version": "1.0.0",
      "categories": ["Office", "Media"],
      "tags": ["pdf", "image", "convert", "jpg", "png", "webp"],
      "color": "#10b981",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Icon", "fr": "Icône", "es": "Icono", "zh": "图标" }, "cols": 1, "rows": 1 },
          { "label": { "en": "Standard", "fr": "Standard", "es": "Estándar", "zh": "标准" }, "cols": 2, "rows": 2 }
        ]
      }
    },
    {
      "id": "hash-generator",
      "name": {
        "en": "Hash Generator",
        "fr": "Générateur de Hash",
        "es": "Generador de Hash",
        "zh": "哈希生成器"
      },
      "description": {
        "en": "Calculate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files. Works entirely offline.",
        "fr": "Calculez des hachages MD5, SHA-1, SHA-256, SHA-384, SHA-512 à partir de texte ou de fichiers. Fonctionne entièrement hors ligne.",
        "es": "Calcula hashes MD5, SHA-1, SHA-256, SHA-384, SHA-512 desde texto o archivos. Funciona completamente sin conexión.",
        "zh": "从文本或文件计算 MD5、SHA-1、SHA-256、SHA-384、SHA-512 哈希值。完全离线工作。"
      },
      "icon": "fingerprint",
      "version": "1.0.0",
      "categories": ["Security", "Developer"],
      "tags": ["hash", "md5", "sha", "sha256", "checksum", "crypto", "security"],
      "featured": true,
      "color": "#6366f1",
      "widget": {
        "supported": true,
        "defaultCols": 2,
        "defaultRows": 2,
        "presets": [
          { "label": { "en": "Standard", "fr": "Standard", "es": "Estándar", "zh": "标准" }, "cols": 2, "rows": 2 },
          { "label": { "en": "Compact", "fr": "Compact", "es": "Compacto", "zh": "紧凑" }, "cols": 2, "rows": 1 }
        ]
      }
    }
  ];

  // Dynamically attach route paths based on ID
  private readonly toolsRegistry: ToolMetadata[] = this.rawRegistry.map(t => ({
    ...t,
    routePath: `tools/${t.id}`
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
  sortOrder = signal<'name' | 'newest'>('name');

  constructor() {
    this.loadFavorites();
    this.loadUsageStats();
    this.loadDashboard();
  }

  // ... (Computed properties unchanged)
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

  // --- Modal Actions ---
  openAddToolModal() { this.addModalOpen.set(true); }
  openFillerModal() { this.fillerModalOpen.set(true); }
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
    if (x < 0 || y < 0) return false;

    for (const widget of existingWidgets) {
      if (widget.instanceId === ignoreId) continue;
      const wl = widget.layout;
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
