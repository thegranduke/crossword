import { View, Text, StyleSheet } from 'react-native';
import type { Cell } from '@/modules/types/puzzle';

type Props = {
  grid: Cell[][];
};

export function Grid({ grid }: Props) {
  return (
    <View style={styles.grid}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell) =>
            cell.solution ? (
              <View key={cell.col} style={styles.cell}>
                <Text style={styles.letter}>{cell.solution}</Text>
              </View>
            ) : (
              <View key={cell.col} style={styles.emptyCell} />
            )
          )}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 28;

const styles = StyleSheet.create({
  grid: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: 'transparent',
  },
  letter: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
});
