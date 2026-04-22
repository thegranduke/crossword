export type GridSize = 10 | 15 | 20;

export type Cell = {
  row: number;
  col: number;
  letter: string;
  isBlocked: boolean;
  acrossNumber?: number;
  downNumber?: number;
  userInput: string;
  state: 'empty' | 'correct' | 'incorrect';
};

export type WordEntry = {
  word: string;
  clue: string;
};

export type PlacedWord = {
  word: string;
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  number: number;
};

export type Puzzle = {
  gridSize: GridSize;
  minWords: number;
  grid: Cell[][];
  placedWords: PlacedWord[];
  rows: number;
  cols: number;
};
