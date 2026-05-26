import type { PlacedWord } from '@/modules/types/puzzle';

export function isCellInWord(word: PlacedWord, row: number, col: number): boolean {
  if (word.direction === 'across') {
    return (
      word.startRow === row &&
      col >= word.startCol &&
      col < word.startCol + word.word.length
    );
  }
  return (
    word.startCol === col &&
    row >= word.startRow &&
    row < word.startRow + word.word.length
  );
}

/** All placed words that pass through this cell (1 or 2 at intersections). */
export function getActiveWordsAtCell(
  placedWords: PlacedWord[],
  row: number,
  col: number,
): PlacedWord[] {
  return placedWords.filter((w) => isCellInWord(w, row, col));
}

export function getHighlightedCellKeys(activeWords: PlacedWord[]): Set<string> {
  const keys = new Set<string>();
  for (const word of activeWords) {
    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === 'across' ? word.startRow : word.startRow + i;
      const c = word.direction === 'across' ? word.startCol + i : word.startCol;
      keys.add(`${r},${c}`);
    }
  }
  return keys;
}

export function isClueActive(clue: PlacedWord, activeWords: PlacedWord[]): boolean {
  return activeWords.some(
    (w) => w.number === clue.number && w.direction === clue.direction,
  );
}
