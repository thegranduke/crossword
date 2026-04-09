import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { usePuzzleStore } from '@/modules/state/usePuzzleStore';
import { Grid } from '@/components/Grid';

export default function PuzzleScreen() {
  const puzzle = usePuzzleStore((s) => s.puzzle);

  if (!puzzle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No puzzle loaded.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Grid</Text>
      <View style={styles.gridWrapper}>
        <Grid grid={puzzle.grid} />
      </View>

      <Text style={styles.sectionTitle}>Clues</Text>
      <View style={styles.clueList}>
        {puzzle.words.map((entry, i) => (
          <View key={entry.word} style={styles.clueRow}>
            <Text style={styles.clueNumber}>{i + 1}.</Text>
            <View style={styles.clueContent}>
              <Text style={styles.clueText}>{entry.clue}</Text>
              <Text style={styles.clueAnswer}>({entry.word.length} letters)</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: '#999',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gridWrapper: {
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
  },
  clueList: {
    gap: 10,
  },
  clueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clueNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    minWidth: 22,
  },
  clueContent: {
    flex: 1,
    gap: 2,
  },
  clueText: {
    fontSize: 14,
    color: '#333',
  },
  clueAnswer: {
    fontSize: 12,
    color: '#999',
  },
});
