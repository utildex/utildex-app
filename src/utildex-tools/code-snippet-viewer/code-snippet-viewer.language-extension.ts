import type { Extension } from '@codemirror/state';
import { css as cssLanguage } from '@codemirror/lang-css';
import { html as htmlLanguage } from '@codemirror/lang-html';
import { java as javaLanguage } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json as jsonLanguage } from '@codemirror/lang-json';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { python as pythonLanguage } from '@codemirror/lang-python';
import { sql as sqlLanguage } from '@codemirror/lang-sql';
import { yaml as yamlLanguage } from '@codemirror/lang-yaml';
import { csharp as csharpLegacy } from '@codemirror/legacy-modes/mode/clike';
import { julia as juliaLegacy } from '@codemirror/legacy-modes/mode/julia';
import { oCaml as ocamlLegacy } from '@codemirror/legacy-modes/mode/mllike';
import { shell as shellLegacy } from '@codemirror/legacy-modes/mode/shell';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import hljs from 'highlight.js/lib/core';
import hljsBash from 'highlight.js/lib/languages/bash';
import hljsCsharp from 'highlight.js/lib/languages/csharp';
import hljsCss from 'highlight.js/lib/languages/css';
import hljsJava from 'highlight.js/lib/languages/java';
import hljsJavascript from 'highlight.js/lib/languages/javascript';
import hljsJson from 'highlight.js/lib/languages/json';
import hljsJulia from 'highlight.js/lib/languages/julia';
import hljsMarkdown from 'highlight.js/lib/languages/markdown';
import hljsOcaml from 'highlight.js/lib/languages/ocaml';
import hljsPython from 'highlight.js/lib/languages/python';
import hljsSql from 'highlight.js/lib/languages/sql';
import hljsTypescript from 'highlight.js/lib/languages/typescript';
import hljsXml from 'highlight.js/lib/languages/xml';
import hljsYaml from 'highlight.js/lib/languages/yaml';
import type { ResolvedSnippetLanguage } from './code-snippet-viewer.kernel';

let isHighlightRegistered = false;

function ensureHighlightRegistration() {
  if (isHighlightRegistered) return;

  hljs.registerLanguage('javascript', hljsJavascript);
  hljs.registerLanguage('typescript', hljsTypescript);
  hljs.registerLanguage('json', hljsJson);
  hljs.registerLanguage('xml', hljsXml);
  hljs.registerLanguage('css', hljsCss);
  hljs.registerLanguage('python', hljsPython);
  hljs.registerLanguage('java', hljsJava);
  hljs.registerLanguage('sql', hljsSql);
  hljs.registerLanguage('bash', hljsBash);
  hljs.registerLanguage('yaml', hljsYaml);
  hljs.registerLanguage('markdown', hljsMarkdown);
  hljs.registerLanguage('csharp', hljsCsharp);
  hljs.registerLanguage('ocaml', hljsOcaml);
  hljs.registerLanguage('julia', hljsJulia);

  isHighlightRegistered = true;
}

const HIGHLIGHT_DETECT_LANGUAGE_IDS = [
  'javascript',
  'typescript',
  'json',
  'xml',
  'css',
  'python',
  'java',
  'sql',
  'bash',
  'yaml',
  'markdown',
  'csharp',
  'ocaml',
  'julia',
] as const;

const HIGHLIGHT_TO_SNIPPET_LANGUAGE: Readonly<Record<string, ResolvedSnippetLanguage>> = {
  javascript: 'javascript',
  typescript: 'typescript',
  json: 'json',
  xml: 'html',
  html: 'html',
  css: 'css',
  python: 'python',
  java: 'java',
  sql: 'sql',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
  csharp: 'csharp',
  cs: 'csharp',
  ocaml: 'ocaml',
  julia: 'julia',
};

export const SUPPORTED_RESOLVED_SNIPPET_LANGUAGES: readonly ResolvedSnippetLanguage[] = [
  'javascript',
  'typescript',
  'json',
  'html',
  'css',
  'python',
  'java',
  'sql',
  'bash',
  'yaml',
  'markdown',
  'csharp',
  'ocaml',
  'julia',
  'plaintext',
];

const LANGUAGE_ALIAS_MAP = new Map<string, ResolvedSnippetLanguage>([
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['typescript', 'typescript'],
  ['ts', 'typescript'],
  ['json', 'json'],
  ['html', 'html'],
  ['css', 'css'],
  ['python', 'python'],
  ['java', 'java'],
  ['sql', 'sql'],
  ['bash', 'bash'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['yaml', 'yaml'],
  ['yml', 'yaml'],
  ['markdown', 'markdown'],
  ['md', 'markdown'],
  ['csharp', 'csharp'],
  ['c#', 'csharp'],
  ['cs', 'csharp'],
  ['dotnet', 'csharp'],
  ['ocaml', 'ocaml'],
  ['ml', 'ocaml'],
  ['julia', 'julia'],
  ['plaintext', 'plaintext'],
  ['text', 'plaintext'],
  ['plain', 'plaintext'],
]);

const PRISM_LANGUAGE_BY_SNIPPET: Readonly<Record<ResolvedSnippetLanguage, string>> = {
  javascript: 'javascript',
  typescript: 'typescript',
  json: 'json',
  html: 'markup',
  css: 'css',
  python: 'python',
  java: 'java',
  sql: 'sql',
  bash: 'bash',
  yaml: 'yaml',
  markdown: 'markdown',
  csharp: 'csharp',
  ocaml: 'ocaml',
  julia: 'julia',
  plaintext: 'none',
};

const PRETTIER_PARSER_BY_SNIPPET: Readonly<Partial<Record<ResolvedSnippetLanguage, string>>> = {
  javascript: 'babel',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  markdown: 'markdown',
};

const DARK_EDITOR_HIGHLIGHT_STYLE = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#64748b' },
  { tag: [tags.propertyName, tags.tagName, tags.number, tags.bool, tags.null], color: '#fda4af' },
  { tag: [tags.string, tags.special(tags.string), tags.attributeName], color: '#86efac' },
  { tag: [tags.operator, tags.url], color: '#93c5fd' },
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: '#c4b5fd' },
  { tag: [tags.function(tags.variableName), tags.className], color: '#fcd34d' },
  { tag: [tags.regexp, tags.variableName], color: '#fdba74' },
]);

const LIGHT_EDITOR_HIGHLIGHT_STYLE = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#64748b' },
  { tag: [tags.propertyName, tags.tagName, tags.number, tags.bool, tags.null], color: '#be123c' },
  { tag: [tags.string, tags.special(tags.string), tags.attributeName], color: '#15803d' },
  { tag: [tags.operator, tags.url], color: '#1d4ed8' },
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: '#7c3aed' },
  { tag: [tags.function(tags.variableName), tags.className], color: '#a16207' },
  { tag: [tags.regexp, tags.variableName], color: '#b45309' },
]);

export function normalizeResolvedLanguageAlias(value: string): ResolvedSnippetLanguage | null {
  return LANGUAGE_ALIAS_MAP.get(value.toLowerCase()) ?? null;
}

export function getPrismLanguageId(language: ResolvedSnippetLanguage): string {
  return PRISM_LANGUAGE_BY_SNIPPET[language] ?? 'none';
}

export function getPrettierParser(language: ResolvedSnippetLanguage): string | undefined {
  return PRETTIER_PARSER_BY_SNIPPET[language];
}

export function detectLanguageWithHighlight(input: string): {
  winner: ResolvedSnippetLanguage | null;
  winnerScore: number;
  secondLanguage: ResolvedSnippetLanguage | null;
  secondScore: number;
} {
  ensureHighlightRegistration();

  const detection = hljs.highlightAuto(input, [...HIGHLIGHT_DETECT_LANGUAGE_IDS]);
  const winner = mapHighlightLanguage(detection.language);
  const winnerScore = Math.max(0, detection.relevance ?? 0);
  const secondBest = detection.secondBest;
  const secondLanguage = mapHighlightLanguage(secondBest?.language);
  const secondScore = Math.max(0, secondBest?.relevance ?? 0);

  return {
    winner,
    winnerScore,
    secondLanguage,
    secondScore,
  };
}

export function buildSnippetSyntaxHighlightExtension(theme: 'dark' | 'light'): Extension {
  return syntaxHighlighting(
    theme === 'dark' ? DARK_EDITOR_HIGHLIGHT_STYLE : LIGHT_EDITOR_HIGHLIGHT_STYLE,
  );
}

function mapHighlightLanguage(value: string | undefined): ResolvedSnippetLanguage | null {
  if (!value) return null;
  return HIGHLIGHT_TO_SNIPPET_LANGUAGE[value] ?? null;
}

export function buildSnippetLanguageExtension(language: ResolvedSnippetLanguage): Extension {
  switch (language) {
    case 'javascript':
      return javascript({ jsx: true });
    case 'typescript':
      return javascript({ typescript: true });
    case 'json':
      return jsonLanguage();
    case 'html':
      return htmlLanguage();
    case 'css':
      return cssLanguage();
    case 'python':
      return pythonLanguage();
    case 'java':
      return javaLanguage();
    case 'sql':
      return sqlLanguage();
    case 'bash':
      return StreamLanguage.define(shellLegacy);
    case 'yaml':
      return yamlLanguage();
    case 'markdown':
      return markdownLanguage();
    case 'csharp':
      return StreamLanguage.define(csharpLegacy);
    case 'ocaml':
      return StreamLanguage.define(ocamlLegacy);
    case 'julia':
      return StreamLanguage.define(juliaLegacy);
    default:
      return [];
  }
}
