import type { Cell } from '@/modules/types/puzzle';

/** True if the cell is an active (non-blocked) letter cell. */
export function isActiveCell(cell: Cell): boolean {
  return !cell.isBlocked;
}

/** True if the user's input matches the solution letter. */
export function isCorrectLetter(cell: Cell): boolean {
  return cell.userInput !== '' && cell.userInput === cell.letter;
}

/** True if every active cell has been filled in correctly. */
export function isPuzzleComplete(grid: Cell[][]): boolean {
  return grid.every((row) =>
    row.every((cell) => cell.isBlocked || isCorrectLetter(cell)),
  );
}
