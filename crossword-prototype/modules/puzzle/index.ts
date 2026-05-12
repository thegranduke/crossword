import type { GridSize, Puzzle } from '@/modules/types/puzzle';
import { generateWordClues } from './generateWordClues';
import generateGrid from '@/modules/grid/gridBuilder';
import { getMinWordsForGridSize } from './config';
import type { WordEntry } from '@/modules/types/puzzle';

type PuzzleSource =
  | { mode: 'topic'; topic: string }
  | { mode: 'create'; rawWords: string };

function parseCustomWordEntries(rawWords: string, gridSize: GridSize): WordEntry[] {
  const seen = new Set<string>();
  const tokens = rawWords
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const entries: WordEntry[] = [];

  for (const token of tokens) {
    const [rawWord, ...clueParts] = token.split(':');
    const word = (rawWord ?? '').trim().toUpperCase();
    const clue = clueParts.join(':').trim();

    if (!/^[A-Z]{3,12}$/.test(word)) continue;
    if (word.length > gridSize) continue;
    if (seen.has(word)) continue;
    seen.add(word);

    entries.push({
      word,
      clue: clue || `Custom word: ${word}`,
    });
  }

  return entries;
}

export async function generatePuzzle(source: PuzzleSource, gridSize: GridSize): Promise<Puzzle> {
  const minWords = getMinWordsForGridSize(gridSize);
  const wordClues =
    source.mode === 'create'
      ? parseCustomWordEntries(source.rawWords, gridSize)
      : await generateWordClues(source.topic, gridSize);

  if (wordClues.length === 0) {
    throw new Error(`No valid words fit in a ${gridSize}x${gridSize} grid.`);
  }

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
