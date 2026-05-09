import type { Type } from '@angular/core';
import { contract } from './sudoku.contract';

export { contract };

export function loadComponent(): Promise<Type<unknown>> {
  return import('./sudoku.component').then((m) => m.SudokuComponent);
}

export function loadKernel(): Promise<Record<string, unknown>> {
  return import('./sudoku.kernel');
}
