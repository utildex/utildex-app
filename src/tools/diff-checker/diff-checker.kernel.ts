export interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffRow {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  changes: number;
}

export type DiffMode = 'Chars' | 'Words' | 'Lines';

export function buildDiffRows(
  changes: DiffChange[],
  mode: DiffMode,
): { rows: DiffRow[]; stats: DiffStats } {
  const rows: DiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;

  changes.forEach((part) => {
    const lines = part.value.split('\n');

    if (lines.length > 0 && lines[lines.length - 1] === '' && mode === 'Lines') {
      lines.pop();
    }

    if (mode !== 'Lines') {
      if (part.added) {
        additions++;
        rows.push({ type: 'added', content: part.value });
      } else if (part.removed) {
        deletions++;
        rows.push({ type: 'removed', content: part.value });
      } else {
        rows.push({ type: 'unchanged', content: part.value });
      }
      return;
    }

    lines.forEach((line) => {
      if (part.added) {
        additions++;
        rows.push({ type: 'added', content: line, newLine: newLine++ });
      } else if (part.removed) {
        deletions++;
        rows.push({ type: 'removed', content: line, oldLine: oldLine++ });
      } else {
        rows.push({ type: 'unchanged', content: line, oldLine: oldLine++, newLine: newLine++ });
      }
    });
  });

  return {
    rows,
    stats: { additions, deletions, changes: additions + deletions },
  };
}

export function run(input: { changes: DiffChange[]; mode: DiffMode }): {
  rows: DiffRow[];
  stats: DiffStats;
} {
  return buildDiffRows(input.changes, input.mode);
}
