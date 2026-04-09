import type { Cell } from '@/modules/types/puzzle';

/** Returns true if the cell is part of an active word (has a solution letter). */
export function isActiveCell(cell: Cell): boolean {
  return cell.solution !== '';
}

/** Returns true if a user's input matches the solution. */
export function isCorrectLetter(cell: Cell): boolean {
  return cell.letter !== '' && cell.letter === cell.solution;
}

/** Returns true if all active cells are filled correctly. */
export function isPuzzleComplete(grid: Cell[][]): boolean {
  return grid.every((row) =>
    row.every((cell) => !isActiveCell(cell) || isCorrectLetter(cell))
  );
}
