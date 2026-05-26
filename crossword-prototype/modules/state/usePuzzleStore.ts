import { create } from 'zustand';
import type { Puzzle } from '@/modules/types/puzzle';

type SelectedCell = { row: number; col: number };

type PuzzleState = {
  puzzle: Puzzle | null;
  selectedCell: SelectedCell | null;
  setPuzzle: (puzzle: Puzzle) => void;
  clearPuzzle: () => void;
  setSelectedCell: (cell: SelectedCell | null) => void;
  /** Update a cell's userInput and derive its state (empty / correct / incorrect). */
  setCellInput: (row: number, col: number, letter: string) => void;
};

export const usePuzzleStore = create<PuzzleState>((set) => ({
  puzzle: null,
  selectedCell: null,

  setPuzzle: (puzzle) => set({ puzzle, selectedCell: null }),
  clearPuzzle: () => set({ puzzle: null, selectedCell: null }),

  setSelectedCell: (cell) => set({ selectedCell: cell }),

  setCellInput: (row, col, letter) =>
    set((state) => {
      if (!state.puzzle) return {};
      const newGrid = state.puzzle.grid.map((r, ri) =>
        r.map((cell, ci) => {
          if (ri !== row || ci !== col) return cell;
          return {
            ...cell,
            userInput: letter,
            state:
              letter === ''
                ? ('empty' as const)
                : letter === cell.letter
                  ? ('correct' as const)
                  : ('incorrect' as const),
          };
        }),
      );
      return { puzzle: { ...state.puzzle, grid: newGrid } };
    }),
}));
