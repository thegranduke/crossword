import type { Puzzle } from '@/modules/types/puzzle';
import { generateWords } from './generateWords';
import { generateClues } from './generateClues';
import { generateGrid } from '@/modules/grid/gridBuilder';

/**
 * Full puzzle generation pipeline.
 * Topic → words → clues → grid → Puzzle
 */
export function generatePuzzle(topic: string): Puzzle {
  const words = generateWords(topic);
  const wordsWithClues = generateClues(words);
  const grid = generateGrid(words);

  return {
    words: wordsWithClues,
    grid,
  };
}
