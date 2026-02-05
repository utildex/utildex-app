
import { I18nText } from './types';

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
    },
    summary: {
      en: 'Discover the benefits of privacy, speed, and ownership that come with local-first applications.',
      fr: 'Découvrez les avantages de la confidentialité, de la vitesse et de la propriété qu\'apportent les applications local-first.',
    },
    thumbnail: '../assets/articles/local-first-philosophy/thumbnail.webp',
    date: '2025-05-15',
    tags: ['Philosophy', 'Dev', 'Privacy'],
    author: 'Utildex Team',
    featured: true,
    readingTime: 5
  },
  {
    id: 'productivity-tips',
    type: 'internal',
    title: {
      en: '10 Tips to Boost Developer Productivity',
      fr: '10 Astuces pour booster la productivité',
    },
    summary: {
      en: 'Small changes in your workflow that can yield massive results over time.',
      fr: 'De petits changements dans votre flux de travail qui peuvent donner des résultats massifs.',
    },
    thumbnail: '../assets/articles/productivity-tips/thumbnail.webp',
    date: '2025-06-10',
    tags: ['Tips', 'Productivity'],
    author: 'Bogus Author',
    featured: true,
    readingTime: 4
  },



/**

    External Zone

*/
  {
    id: 'external-open-source-redhat',
    type: 'external',
    title: {
      en: 'What is Open Source Software ?',
      fr: 'Qu’est-ce qu’un logiciel open source ?',
      es: '¿Qué es el software de código abierto?',
      zh: '什么是开源软件？'
    },
    summary: {
      en: 'Red Hat’s definition of open source software and how it is developed and shared.',
      fr: 'La définition du logiciel open source selon Red Hat et son mode de développement et de collaboration.',
      es: 'La definición del software de código abierto según Red Hat y cómo se desarrolla y comparte.',
      zh: 'Red Hat 对开源软件的定义，以及其开发和共享方式。'
    },
    thumbnail: '../assets/images/external-thumbnails/external-open-source-redhat-thumbnail.webp',
    date: '2025-04-20',
    tags: ['Open Source', 'Red Hat', 'External'],
    author: 'Red Hat',
    featured: true,
    readingTime: 10,
    url: 'https://www.redhat.com/en/topics/open-source/what-is-open-source'
  }

];
