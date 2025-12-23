
import { I18nText } from '../services/i18n.service';

export type ArticleType = 'internal' | 'external';

export interface ArticleMetadata {
  id: string;
  title: I18nText;
  summary: I18nText;
  thumbnail: string; // URL to image/gif
  date: string; // ISO 8601 YYYY-MM-DD
  tags: string[];
  author: string;
  featured: boolean;
  readingTime: number; // minutes
  type: ArticleType;
  url?: string; // Required if type === 'external'
}

export const ARTICLE_REGISTRY: ArticleMetadata[] = [
  {
    id: 'local-first-philosophy',
    type: 'internal',
    title: { 
      en: 'Why Local-First Software Matters',
      fr: 'Pourquoi le logiciel Local-First est important',
      es: 'Por qué importa el software Local-First',
      zh: '为什么本地优先软件很重要'
    },
    summary: {
      en: 'Discover the benefits of privacy, speed, and ownership that come with local-first applications.',
      fr: 'Découvrez les avantages de la confidentialité, de la vitesse et de la propriété qu\'apportent les applications local-first.',
      es: 'Descubra los beneficios de privacidad, velocidad y propiedad que conllevan las aplicaciones local-first.',
      zh: '探索本地优先应用程序带来的隐私、速度和所有权的好处。'
    },
    thumbnail: 'https://picsum.photos/id/48/400/300',
    date: '2025-05-15',
    tags: ['Philosophy', 'Dev', 'Privacy'],
    author: 'Utildex Team',
    featured: true,
    readingTime: 5
  },
  {
    id: 'angular-signals-guide',
    type: 'internal',
    title: {
      en: 'Mastering Angular Signals',
      fr: 'Maîtriser les Signals Angular',
      es: 'Dominando Angular Signals',
      zh: '精通 Angular Signals'
    },
    summary: {
      en: 'A comprehensive guide to reactive state management in modern Angular applications.',
      fr: 'Un guide complet sur la gestion d\'état réactif dans les applications Angular modernes.',
      es: 'Una guía completa para la gestión de estado reactivo en aplicaciones Angular modernas.',
      zh: '现代 Angular 应用程序中响应式状态管理的综合指南。'
    },
    thumbnail: 'https://picsum.photos/id/180/400/300',
    date: '2025-06-02',
    tags: ['Dev', 'Angular', 'Tutorial'],
    author: 'Alex Dev',
    featured: true,
    readingTime: 8
  },
  {
    id: 'productivity-tips',
    type: 'internal',
    title: {
      en: '10 Tips to Boost Developer Productivity',
      fr: '10 Astuces pour booster la productivité',
      es: '10 Consejos para aumentar la productividad',
      zh: '10 个提高开发者生产力的技巧'
    },
    summary: {
      en: 'Small changes in your workflow that can yield massive results over time.',
      fr: 'De petits changements dans votre flux de travail qui peuvent donner des résultats massifs.',
      es: 'Pequeños cambios en su flujo de trabajo que pueden dar resultados masivos.',
      zh: '工作流程中的微小变化可以随着时间的推移产生巨大的成果。'
    },
    thumbnail: 'https://picsum.photos/id/3/400/300',
    date: '2025-06-10',
    tags: ['Tips', 'Productivity'],
    author: 'Sarah Lead',
    featured: false,
    readingTime: 4
  },
  {
    id: 'external-ts-guide',
    type: 'external',
    title: {
      en: 'Advanced TypeScript Patterns',
      fr: 'Modèles TypeScript Avancés',
      es: 'Patrones Avanzados de TypeScript',
      zh: '高级 TypeScript 模式'
    },
    summary: {
      en: 'A deep dive into generic types and utility types. (External Link)',
      fr: 'Une plongée approfondie dans les types génériques et utilitaires. (Lien Externe)',
      es: 'Una inmersión profunda en tipos genéricos y utilitarios. (Enlace Externo)',
      zh: '深入研究泛型类型和实用程序类型。（外部链接）'
    },
    thumbnail: 'https://picsum.photos/id/20/400/300',
    date: '2025-04-20',
    tags: ['Dev', 'TypeScript', 'External'],
    author: 'External Source',
    featured: false,
    readingTime: 10,
    url: 'https://www.typescriptlang.org/docs/'
  }
];
