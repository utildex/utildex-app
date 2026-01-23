
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
      es: '10 Consejos para aumentar la productividad',
      zh: '10 个提高开发者生产力的技巧'
    },
    summary: {
      en: 'Small changes in your workflow that can yield massive results over time.',
      fr: 'De petits changements dans votre flux de travail qui peuvent donner des résultats massifs.',
      es: 'Pequeños cambios en su flujo de trabajo que pueden dar resultados masivos.',
      zh: '工作流程中的微小变化可以随着时间的推移产生巨大的成果。'
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
