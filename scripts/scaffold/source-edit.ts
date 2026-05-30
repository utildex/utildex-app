export function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error('[scaffold] Could not find matching object brace.');
}

export function insertObjectEntry(source: string, objectName: string, entry: string): string {
  const declaration = new RegExp(`(?:const|export const)\\s+${objectName}\\b`);
  const match = declaration.exec(source);
  if (!match) {
    throw new Error(`[scaffold] Could not find object ${objectName}.`);
  }

  const openIndex = source.indexOf('{', match.index + match[0].length);
  if (openIndex === -1) {
    throw new Error(`[scaffold] Could not find opening brace for ${objectName}.`);
  }

  const closeIndex = findMatchingBrace(source, openIndex);
  const beforeClose = source.slice(0, closeIndex).replace(/\s*$/, '');
  const afterClose = source.slice(closeIndex);
  const separator = beforeClose.endsWith('{') ? '\n' : ',\n';
  return `${beforeClose}${separator}${entry}\n${afterClose}`;
}
