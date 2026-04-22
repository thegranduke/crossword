import type { Cell, GridSize, PlacedWord, WordEntry } from '@/modules/types/puzzle';

interface WorkPlacement {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
}

export interface GridResult {
  grid: Cell[][];
  placedWords: PlacedWord[];
  rows: number;
  cols: number;
}

type GridOptions = {
  gridSize: GridSize;
  minPlacedWords: number;
  attempts?: number;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function scoreLayout(grid: string[][], placements: WorkPlacement[]): number {
  let openCells = 0;
  let intersections = 0;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (grid[row][col] === '') continue;
      openCells += 1;

      const hasHorizontal =
        (col > 0 && grid[row][col - 1] !== '') ||
        (col < grid.length - 1 && grid[row][col + 1] !== '');

      const hasVertical =
        (row > 0 && grid[row - 1][col] !== '') ||
        (row < grid.length - 1 && grid[row + 1][col] !== '');

      if (hasHorizontal && hasVertical) {
        intersections += 1;
      }
    }
  }

  return placements.length * 3000 + intersections * 220 + openCells * 10;
}

function buildCellNumbers(grid: string[][]): Map<string, number> {
  const numbers = new Map<string, number>();
  let next = 1;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (grid[row][col] === '') continue;

      const startsAcross =
        (col === 0 || grid[row][col - 1] === '') &&
        col + 1 < grid.length &&
        grid[row][col + 1] !== '';

      const startsDown =
        (row === 0 || grid[row - 1][col] === '') &&
        row + 1 < grid.length &&
        grid[row + 1][col] !== '';

      if (startsAcross || startsDown) {
        numbers.set(`${row},${col}`, next);
        next += 1;
      }
    }
  }

  return numbers;
}

function createCandidate(
  wordClues: WordEntry[],
  gridSize: number,
  minPlacedWords: number,
): {
  grid: string[][];
  placements: WorkPlacement[];
  score: number;
} {
  const grid = Array.from({ length: gridSize }, () => Array<string>(gridSize).fill(''));
  const placements: WorkPlacement[] = [];
  const center = Math.floor(gridSize / 2);

  const inBounds = (row: number, col: number): boolean =>
    row >= 0 && row < gridSize && col >= 0 && col < gridSize;

  const writeWord = (
    word: string,
    direction: 'across' | 'down',
    startRow: number,
    startCol: number,
  ): void => {
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      grid[startRow + dr * i][startCol + dc * i] = word[i];
    }
  };

  const isValidPlacement = (
    word: string,
    direction: 'across' | 'down',
    startRow: number,
    startCol: number,
  ): boolean => {
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    const endRow = startRow + dr * (word.length - 1);
    const endCol = startCol + dc * (word.length - 1);

    if (!inBounds(startRow, startCol) || !inBounds(endRow, endCol)) {
      return false;
    }

    if (inBounds(startRow - dr, startCol - dc) && grid[startRow - dr][startCol - dc] !== '') {
      return false;
    }

    if (inBounds(endRow + dr, endCol + dc) && grid[endRow + dr][endCol + dc] !== '') {
      return false;
    }

    const pr = direction === 'across' ? 1 : 0;
    const pc = direction === 'down' ? 1 : 0;

    for (let i = 0; i < word.length; i++) {
      const row = startRow + dr * i;
      const col = startCol + dc * i;
      const existing = grid[row][col];

      if (existing !== '') {
        if (existing !== word[i]) return false;
      } else {
        if (
          (inBounds(row - pr, col - pc) && grid[row - pr][col - pc] !== '') ||
          (inBounds(row + pr, col + pc) && grid[row + pr][col + pc] !== '')
        ) {
          return false;
        }
      }
    }

    return true;
  };

  const sorted = [...wordClues].sort((a, b) => b.word.length - a.word.length);
  const [anchor, ...rest] = sorted;

  if (!anchor) {
    return { grid, placements, score: Number.NEGATIVE_INFINITY };
  }

  const anchorStartCol = center - Math.floor(anchor.word.length / 2);
  if (!isValidPlacement(anchor.word, 'across', center, anchorStartCol)) {
    return { grid, placements, score: Number.NEGATIVE_INFINITY };
  }

  writeWord(anchor.word, 'across', center, anchorStartCol);
  placements.push({
    ...anchor,
    direction: 'across',
    startRow: center,
    startCol: anchorStartCol,
  });

  for (const candidate of shuffle(rest)) {
    const existingOrder = shuffle(placements);
    let bestPlacement: WorkPlacement | null = null;
    let bestPlacementScore = Number.NEGATIVE_INFINITY;

    for (const existing of existingOrder) {
      const candidateDirection: 'across' | 'down' =
        existing.direction === 'across' ? 'down' : 'across';

      const eDr = existing.direction === 'down' ? 1 : 0;
      const eDc = existing.direction === 'across' ? 1 : 0;
      const cDr = candidateDirection === 'down' ? 1 : 0;
      const cDc = candidateDirection === 'across' ? 1 : 0;

      for (const existingIndex of shuffle([...existing.word].map((_, index) => index))) {
        for (const candidateIndex of shuffle([...candidate.word].map((_, index) => index))) {
          if (existing.word[existingIndex] !== candidate.word[candidateIndex]) continue;

          const crossRow = existing.startRow + eDr * existingIndex;
          const crossCol = existing.startCol + eDc * existingIndex;

          const startRow = crossRow - cDr * candidateIndex;
          const startCol = crossCol - cDc * candidateIndex;

          if (!isValidPlacement(candidate.word, candidateDirection, startRow, startCol)) continue;

          const trialGrid = grid.map((row) => [...row]);
          const dr = candidateDirection === 'down' ? 1 : 0;
          const dc = candidateDirection === 'across' ? 1 : 0;
          for (let i = 0; i < candidate.word.length; i++) {
            trialGrid[startRow + dr * i][startCol + dc * i] = candidate.word[i];
          }

          const trialScore = scoreLayout(trialGrid, [
            ...placements,
            {
              ...candidate,
              direction: candidateDirection,
              startRow,
              startCol,
            },
          ]);

          if (trialScore > bestPlacementScore) {
            bestPlacementScore = trialScore;
            bestPlacement = {
              ...candidate,
              direction: candidateDirection,
              startRow,
              startCol,
            };
          }
        }
      }
    }

    if (!bestPlacement) continue;

    writeWord(
      bestPlacement.word,
      bestPlacement.direction,
      bestPlacement.startRow,
      bestPlacement.startCol,
    );
    placements.push(bestPlacement);
  }

  // If we still have too few words, try to place extras even without
  // intersections, while still obeying all placement validity rules.
  if (placements.length < minPlacedWords) {
    const unplaced = rest.filter(
      (entry) => !placements.some((placed) => placed.word === entry.word),
    );

    const placeAnywhere = (entry: WordEntry): WorkPlacement | null => {
      const directions: Array<'across' | 'down'> = shuffle(['across', 'down']);
      const rows = shuffle(Array.from({ length: gridSize }, (_, i) => i));
      const cols = shuffle(Array.from({ length: gridSize }, (_, i) => i));

      for (const direction of directions) {
        for (const row of rows) {
          for (const col of cols) {
            if (!isValidPlacement(entry.word, direction, row, col)) continue;
            return {
              ...entry,
              direction,
              startRow: row,
              startCol: col,
            };
          }
        }
      }

      return null;
    };

    for (const entry of unplaced) {
      if (placements.length >= minPlacedWords) break;
      const placement = placeAnywhere(entry);
      if (!placement) continue;

      writeWord(placement.word, placement.direction, placement.startRow, placement.startCol);
      placements.push(placement);
    }
  }

  return {
    grid,
    placements,
    score: scoreLayout(grid, placements),
  };
}

export default function generateGrid(wordClues: WordEntry[], options: GridOptions): GridResult {
  const { gridSize, minPlacedWords } = options;
  const attempts = options.attempts ?? 72;

  if (wordClues.length === 0) {
    return { grid: [], placedWords: [], rows: 0, cols: 0 };
  }

  let best = createCandidate(wordClues, gridSize, minPlacedWords);

  for (let attempt = 1; attempt < attempts; attempt++) {
    const candidate = createCandidate(wordClues, gridSize, minPlacedWords);
    const meetsMinimum = candidate.placements.length >= minPlacedWords;
    const bestMeetsMinimum = best.placements.length >= minPlacedWords;

    if (
      (meetsMinimum && !bestMeetsMinimum) ||
      (meetsMinimum === bestMeetsMinimum && candidate.score > best.score)
    ) {
      best = candidate;
    }
  }

  const cellNumbers = buildCellNumbers(best.grid);

  const placedWords: PlacedWord[] = best.placements
    .map((placement) => ({
      word: placement.word,
      clue: placement.clue,
      direction: placement.direction,
      startRow: placement.startRow,
      startCol: placement.startCol,
      number: cellNumbers.get(`${placement.startRow},${placement.startCol}`) ?? 0,
    }))
    .sort((a, b) => a.number - b.number);

  const grid: Cell[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => {
      const letter = best.grid[row][col];
      return {
        row,
        col,
        letter,
        isBlocked: letter === '',
        userInput: '',
        state: 'empty' as const,
      };
    }),
  );

  for (const word of placedWords) {
    const dr = word.direction === 'down' ? 1 : 0;
    const dc = word.direction === 'across' ? 1 : 0;

    for (let i = 0; i < word.word.length; i++) {
      const cell = grid[word.startRow + dr * i][word.startCol + dc * i];
      if (word.direction === 'across') {
        cell.acrossNumber = word.number;
      } else {
        cell.downNumber = word.number;
      }
    }
  }

  return {
    grid,
    placedWords,
    rows: gridSize,
    cols: gridSize,
  };
}
