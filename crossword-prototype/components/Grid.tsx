import { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import type { Cell, PlacedWord } from '@/modules/types/puzzle';

type Props = {
  grid: Cell[][];
  placedWords: PlacedWord[];
};

function resolveCellSize(gridSize: number, maxCanvasWidth: number): number {
  const target = Math.floor(maxCanvasWidth / gridSize);
  return Math.max(14, Math.min(34, target));
}

export function Grid({ grid, placedWords }: Props) {
  const { width } = useWindowDimensions();
  const gridSize = grid.length;

  const startNumbers = useMemo(() => {
    const map = new Map<string, number>();
    for (const word of placedWords) {
      map.set(`${word.startRow},${word.startCol}`, word.number);
    }
    return map;
  }, [placedWords]);

  const activeCells = useMemo(() => {
    return grid.flatMap((row) => row.filter((cell) => !cell.isBlocked));
  }, [grid]);

  const cellSize = resolveCellSize(gridSize || 10, Math.min(width - 56, 520));
  const canvasSize = cellSize * gridSize;

  return (
    <View style={[styles.canvas, { width: canvasSize, height: canvasSize }]}>
      {activeCells.map((cell) => {
        const cellNumber = startNumbers.get(`${cell.row},${cell.col}`);
        return (
          <View
            key={`${cell.row}-${cell.col}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                left: cell.col * cellSize,
                top: cell.row * cellSize,
              },
            ]}
          >
            {cellNumber !== undefined && <Text style={styles.cellNumber}>{cellNumber}</Text>}
            <Text style={styles.letter}>{cell.letter}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'relative',
  },
  cell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNumber: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: 7,
    fontWeight: '700',
    color: '#555',
    lineHeight: 9,
  },
  letter: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
});
