import type { GridSize, Puzzle } from '@/modules/types/puzzle';
import { generateWordClues } from './generateWordClues';
import generateGrid from '@/modules/grid/gridBuilder';
import { getMinWordsForGridSize } from './config';

export async function generatePuzzle(topic: string, gridSize: GridSize): Promise<Puzzle> {
  const minWords = getMinWordsForGridSize(gridSize);
  const wordClues = await generateWordClues(topic, gridSize);
  const { grid, placedWords, rows, cols } = generateGrid(wordClues, {
    gridSize,
    minPlacedWords: minWords,
  });

  return {
    gridSize,
    minWords,
    grid,
    placedWords,
    rows,
    cols,
  };
}
