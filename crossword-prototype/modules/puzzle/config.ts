import type { GridSize } from '@/modules/types/puzzle';

export const GRID_SIZE_OPTIONS: GridSize[] = [10, 15, 20];

export const MIN_WORDS_BY_GRID_SIZE: Record<GridSize, number> = {
  10: 7,
  15: 11,
  20: 15,
};

export function getMinWordsForGridSize(gridSize: GridSize): number {
  return MIN_WORDS_BY_GRID_SIZE[gridSize];
}
