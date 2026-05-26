import { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import type { Cell, PlacedWord } from '@/modules/types/puzzle';
import { GridCell } from '@/components/GridCell';

type Props = {
  grid: Cell[][];
  placedWords: PlacedWord[];
  selectedCell?: { row: number; col: number } | null;
  /** FR-22: cells belonging to the active across/down word(s) */
  highlightedCellKeys?: Set<string>;
  onCellPress?: (row: number, col: number) => void;
  onCellLetter?: (row: number, col: number, letter: string) => void;
  /** Tap on grid background (not on a cell) — e.g. deselect active cell */
  onCanvasPress?: () => void;
};

function resolveCellSize(gridSize: number, maxCanvasWidth: number): number {
  const target = Math.floor(maxCanvasWidth / gridSize);
  return Math.max(14, Math.min(34, target));
}

export function Grid({
  grid,
  placedWords,
  selectedCell,
  highlightedCellKeys,
  onCellPress,
  onCellLetter,
  onCanvasPress,
}: Props) {
  const { width } = useWindowDimensions();
  const gridSize = grid.length;

  const startNumbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const word of placedWords) {
      map.set(`${word.startRow},${word.startCol}`, word.number);
    }
    return map;
  }, [placedWords]);

  const activeCells = useMemo(
    () => grid.flatMap((row) => row.filter((cell) => !cell.isBlocked)),
    [grid],
  );

  const cellSize = resolveCellSize(gridSize || 10, Math.min(width - 56, 520));
  const canvasSize = cellSize * gridSize;

  return (
    <View style={[styles.canvas, { width: canvasSize, height: canvasSize }]}>
      {activeCells.map((cell) => {
        const cellNumber = startNumbers.get(`${cell.row},${cell.col}`);
        const isSelected =
          selectedCell?.row === cell.row && selectedCell?.col === cell.col;

        const isInActiveWord = highlightedCellKeys?.has(`${cell.row},${cell.col}`) ?? false;

        let cellBg = '#ffffff';
        if (isSelected) {
          cellBg = '#d0e4ff';
        } else if (isInActiveWord) {
          cellBg = '#e8f0ff';
        } else if (cell.state === 'correct') {
          cellBg = '#d4f0d4';
        } else if (cell.state === 'incorrect') {
          cellBg = '#ffd4d4';
        }

        const borderColor =
          isSelected ? '#3a6ef5' : isInActiveWord ? '#7aa8f5' : '#2c2c2c';
        const borderWidth = isSelected ? 2 : isInActiveWord ? 1.5 : 1;

        const letterStyle =
          cell.state === 'correct'
            ? styles.letterCorrect
            : cell.state === 'incorrect'
              ? styles.letterIncorrect
              : undefined;

        return (
          <GridCell
            key={`${cell.row}-${cell.col}`}
            cellNumber={cellNumber}
            userInput={cell.userInput}
            cellBg={cellBg}
            borderColor={borderColor}
            borderWidth={borderWidth}
            letterStyle={letterStyle}
            width={cellSize}
            height={cellSize}
            left={cell.col * cellSize}
            top={cell.row * cellSize}
            isSelected={isSelected}
            onSelect={() => onCellPress?.(cell.row, cell.col)}
            onLetter={(letter) => onCellLetter?.(cell.row, cell.col, letter)}
          />
        );
      })}
      {/* Tap gaps between cells to deselect — cells stop propagation */}
      <View
        style={[StyleSheet.absoluteFill, styles.canvasHitArea]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={onCanvasPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'relative',
    overflow: 'visible',
  },
  canvasHitArea: {
    zIndex: 0,
  },
  letterCorrect: {
    color: '#1a7a1a',
  },
  letterIncorrect: {
    color: '#c0392b',
  },
});
