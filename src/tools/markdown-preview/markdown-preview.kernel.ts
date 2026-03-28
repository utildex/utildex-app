import type { z } from 'zod';
import { schema } from './markdown-preview.schema';

export function parseMarkdownToHtml(markdown: string): string {
  let md = markdown;
  if (!md) return '';

  md = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  md = md.replace(/^# (.*$)/gim, '<h1 class="text-3xl mb-4">$1</h1>');
  md = md.replace(/^## (.*$)/gim, '<h2 class="text-2xl mb-3">$1</h2>');
  md = md.replace(/^### (.*$)/gim, '<h3 class="text-xl mb-2">$1</h3>');
  md = md.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  md = md.replace(/\*(.*)\*/gim, '<em>$1</em>');
  md = md.replace(
    /^\> (.*$)/gim,
    '<blockquote class="border-l-4 border-slate-300 pl-4 italic">$1</blockquote>',
  );
  md = md.replace(
    /`(.*?)`/gim,
    '<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">$1</code>',
  );
  md = md.replace(
    /\[([^\]]+)\]\(([^)]+)\)/gim,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  md = md.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
  md = md.replace(/<\/ul>\s*<ul>/gim, '');
  md = md.replace(/\n\n/gim, '<br><br>');
  md = md.replace(/([^>])\n([^<])/gim, '$1<br>$2');
  return md;
}

export function buildHtmlDocument(contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Exported Markdown</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:2rem;color:#333}h1,h2,h3{color:#111}code{background:#f1f5f9;padding:0.2em 0.4em;border-radius:4px;font-family:monospace}blockquote{border-left:4px solid #cbd5e1;padding-left:1em;font-style:italic;color:#64748b}</style>
</head>
<body>
${contentHtml}
</body>
</html>`;
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  return { html: parseMarkdownToHtml(input) };
}
