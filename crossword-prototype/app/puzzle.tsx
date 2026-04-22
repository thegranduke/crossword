import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { usePuzzleStore } from '@/modules/state/usePuzzleStore';
import { Grid } from '@/components/Grid';
import type { PlacedWord } from '@/modules/types/puzzle';

export default function PuzzleScreen() {
  const puzzle = usePuzzleStore((s) => s.puzzle);

  if (!puzzle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No puzzle loaded.</Text>
      </View>
    );
  }

  const acrossClues = puzzle.placedWords
    .filter((word) => word.direction === 'across')
    .sort((a, b) => a.number - b.number);

  const downClues = puzzle.placedWords
    .filter((word) => word.direction === 'down')
    .sort((a, b) => a.number - b.number);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Grid</Text>
      <Text style={styles.metaText}>
        Size: {puzzle.gridSize}x{puzzle.gridSize} | Placed: {puzzle.placedWords.length} | Target minimum: {puzzle.minWords}
      </Text>

      <View style={styles.gridWrapper}>
        <Grid grid={puzzle.grid} placedWords={puzzle.placedWords} />
      </View>

      <View style={styles.clueColumns}>
        <View style={styles.clueColumn}>
          <ClueSection title="Across" clues={acrossClues} />
        </View>
        <View style={styles.clueColumn}>
          <ClueSection title="Down" clues={downClues} />
        </View>
      </View>
    </ScrollView>
  );
}

function ClueSection({ title, clues }: { title: string; clues: PlacedWord[] }) {
  if (clues.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.clueList}>
        {clues.map((entry) => (
          <View key={`${entry.direction}-${entry.number}-${entry.word}`} style={styles.clueRow}>
            <Text style={styles.clueNumber}>{entry.number}.</Text>
            <View style={styles.clueContent}>
              <Text style={styles.clueText}>{entry.clue}</Text>
              <Text style={styles.clueAnswer}>({entry.word.length} letters)</Text>
            </View>
          </View>
        ))}
      </View>
    </>
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
  metaText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  gridWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  clueList: {
    gap: 8,
  },
  clueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clueNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    minWidth: 24,
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
  clueColumns: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  clueColumn: {
    flex: 1,
    minWidth: 0,
  },
});
