import type { ArticleMetadata } from './article-registry';

/**
 * Synedex Article Registry
 *
 * Articles here are exclusively for Synedex. They do NOT appear in the Utildex build.
 * Add Synedex-specific articles (guides, cognitive science tips, etc.) here.
 *
 * The sitemap generator loads this file when invoked with --app=synedex.
 */
export const ARTICLE_REGISTRY: ArticleMetadata[] = [
  // Synedex articles will be added here.
  // Example:
  // {
  //   id: 'science-of-focus',
  //   type: 'internal',
  //   appName: 'synedex',
  //   title: { en: 'The Science of Focus', fr: 'La Science de la Concentration' },
  //   summary: { en: 'How short mental exercises improve your attention span.' },
  //   thumbnail: '../assets/articles/science-of-focus/thumbnail.webp',
  //   date: '2026-01-01',
  //   tags: ['Neuroscience', 'Focus', 'Wellness'],
  //   author: 'Synedex Team',
  //   featured: true,
  //   readingTime: 5,
  // },
];
