export type Cell = {
  row: number;
  col: number;
  letter: string;
  solution: string;
};

export type WordEntry = {
  word: string;
  clue: string;
};

export type Puzzle = {
  words: WordEntry[];
  grid: Cell[][];
};
