import { create } from 'zustand';
import type { Puzzle } from '@/modules/types/puzzle';

type PuzzleState = {
  puzzle: Puzzle | null;
  setPuzzle: (puzzle: Puzzle) => void;
  clearPuzzle: () => void;
};

export const usePuzzleStore = create<PuzzleState>((set) => ({
  puzzle: null,
  setPuzzle: (puzzle) => set({ puzzle }),
  clearPuzzle: () => set({ puzzle: null }),
}));
