import { I18nText } from './types';
import { articleRegistryI18n } from './articles/i18n/article-registry.i18n';

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

type ArticleId = keyof (typeof articleRegistryI18n)['en'];
type ArticleTextEntry = { title: string; summary: string };

function articleLocalizedText(articleId: ArticleId, key: 'title' | 'summary'): I18nText {
  const perLanguage = Object.entries(articleRegistryI18n) as Array<
    [string, Partial<Record<ArticleId, ArticleTextEntry>>]
  >;

  return Object.fromEntries(
    perLanguage
      .map(([lang, values]) => [lang, values[articleId]?.[key]])
      .filter(([, value]) => typeof value === 'string'),
  );
}

export const ARTICLE_REGISTRY: ArticleMetadata[] = [
  {
    id: 'local-first-philosophy',
    type: 'internal',
    title: articleLocalizedText('local-first-philosophy', 'title'),
    summary: articleLocalizedText('local-first-philosophy', 'summary'),
    thumbnail: '../assets/articles/local-first-philosophy/thumbnail.webp',
    date: '2025-05-15',
    tags: ['Philosophy', 'Dev', 'Privacy'],
    author: 'Utildex Team',
    featured: true,
    readingTime: 5,
  },
  {
    id: 'productivity-tips',
    type: 'internal',
    title: articleLocalizedText('productivity-tips', 'title'),
    summary: articleLocalizedText('productivity-tips', 'summary'),
    thumbnail: '../assets/articles/productivity-tips/thumbnail.webp',
    date: '2025-06-10',
    tags: ['Tips', 'Productivity'],
    author: 'Bogus Author',
    featured: true,
    readingTime: 4,
  },

  /**

    External Zone

*/
  {
    id: 'external-open-source-redhat',
    type: 'external',
    title: articleLocalizedText('external-open-source-redhat', 'title'),
    summary: articleLocalizedText('external-open-source-redhat', 'summary'),
    thumbnail: '../assets/images/external-thumbnails/external-open-source-redhat-thumbnail.webp',
    date: '2025-04-20',
    tags: ['Open Source', 'Red Hat', 'External'],
    author: 'Red Hat',
    featured: true,
    readingTime: 10,
    url: 'https://www.redhat.com/en/topics/open-source/what-is-open-source',
  },
];
