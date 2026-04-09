import type { Cell } from '@/modules/types/puzzle';

const GRID_COLS = 12;

/**
 * Places each word horizontally on its own row.
 * Empty cells get letter '' and solution ''.
 * This is a simple v1 — no intersections yet.
 */
export function generateGrid(words: string[]): Cell[][] {
  return words.map((word, rowIndex) => {
    const row: Cell[] = [];

    for (let col = 0; col < GRID_COLS; col++) {
      const letter = word[col] ?? '';
      row.push({
        row: rowIndex,
        col,
        letter: '',
        solution: letter,
      });
    }

    return row;
  });
}
