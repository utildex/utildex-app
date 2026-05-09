import type { z } from 'zod';
import { schema } from './lorem-ipsum.schema';

export interface LoremOptions {
  count: number;
  startWithLorem: boolean;
  rng?: () => number;
}

const WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'ut',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'ut',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'dolor',
  'in',
  'reprehenderit',
  'in',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'dolore',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'in',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
] as const;

export function generateLorem(options: LoremOptions): string[] {
  const paragraphs: string[] = [];
  const rng = options.rng ?? Math.random;
  const num = Math.max(1, Math.min(50, options.count));

  for (let i = 0; i < num; i++) {
    let paragraph = '';
    if (i === 0 && options.startWithLorem) {
      paragraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    }

    const length = Math.floor(rng() * 50) + 20;
    for (let j = 0; j < length; j++) {
      const word = WORDS[Math.floor(rng() * WORDS.length)];
      if (j === 0 && !paragraph) {
        paragraph += word.charAt(0).toUpperCase() + word.slice(1);
      } else {
        paragraph += (paragraph ? ' ' : '') + word;
      }
    }
    paragraphs.push(`${paragraph}.`);
  }

  return paragraphs;
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return {
    paragraphs: generateLorem({ count: input.count, startWithLorem: input.startWithLorem }),
  };
}
