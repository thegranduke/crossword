import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { usePuzzleStore } from '@/modules/state/usePuzzleStore';
import { Grid } from '@/components/Grid';
import { preloadTfliteModel } from '@/modules/recognition/mlRecognize';
import {
  getActiveWordsAtCell,
  getHighlightedCellKeys,
  isClueActive,
} from '@/modules/puzzle/activeWord';
import type { PlacedWord } from '@/modules/types/puzzle';

export default function PuzzleScreen() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const selectedCell = usePuzzleStore((s) => s.selectedCell);
  const setSelectedCell = usePuzzleStore((s) => s.setSelectedCell);
  const setCellInput = usePuzzleStore((s) => s.setCellInput);

  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      preloadTfliteModel();
    }
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedCell(null);
  }, [setSelectedCell]);

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      setSelectedCell({ row, col });
    },
    [setSelectedCell],
  );

  const advanceToNextCell = useCallback(
    (row: number, col: number) => {
      if (!puzzle) return;
      const cell = puzzle.grid[row]?.[col];
      if (!cell) return;

      const direction: 'across' | 'down' = cell.acrossNumber ? 'across' : 'down';
      const nextRow = row + (direction === 'down' ? 1 : 0);
      const nextCol = col + (direction === 'across' ? 1 : 0);
      const nextCell = puzzle.grid[nextRow]?.[nextCol];

      if (nextCell && !nextCell.isBlocked) {
        setSelectedCell({ row: nextRow, col: nextCol });
      }
    },
    [puzzle, setSelectedCell],
  );

  const handleCellLetter = useCallback(
    (row: number, col: number, letter: string) => {
      setCellInput(row, col, letter);
      if (letter) {
        advanceToNextCell(row, col);
      }
    },
    [setCellInput, advanceToNextCell],
  );

  const activeWords = useMemo(() => {
    if (!puzzle || !selectedCell) return [];
    return getActiveWordsAtCell(
      puzzle.placedWords,
      selectedCell.row,
      selectedCell.col,
    );
  }, [puzzle, selectedCell]);

  const highlightedCellKeys = useMemo(
    () => getHighlightedCellKeys(activeWords),
    [activeWords],
  );

  const activeClueLabel = useMemo(() => {
    if (activeWords.length === 0) return null;
    return activeWords
      .map((w) => `${w.number} ${w.direction === 'across' ? 'Across' : 'Down'}`)
      .join(' · ');
  }, [activeWords]);

  if (!puzzle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No puzzle loaded.</Text>
      </View>
    );
  }

  const acrossClues = puzzle.placedWords
    .filter((w) => w.direction === 'across')
    .sort((a, b) => a.number - b.number);

  const downClues = puzzle.placedWords
    .filter((w) => w.direction === 'down')
    .sort((a, b) => a.number - b.number);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Grid</Text>
          <TouchableOpacity
            onPress={() => setShowAnswers((v) => !v)}
            style={[styles.answerToggle, showAnswers && styles.answerToggleOn]}
            activeOpacity={0.75}
          >
            <Text style={[styles.answerToggleText, showAnswers && styles.answerToggleTextOn]}>
              {showAnswers ? 'Hide answers' : 'Show answers'}
            </Text>
          </TouchableOpacity>
        </View>
        <Pressable onPress={handleDeselect}>
          <Text style={styles.metaText}>
            {puzzle.gridSize}×{puzzle.gridSize} · {puzzle.placedWords.length} words ·{' '}
            {selectedCell
              ? activeClueLabel
                ? `Active: ${activeClueLabel} — draw in the blue cell, wait 1.5s for ML`
                : 'draw in the highlighted cell'
              : 'tap a cell to enter a letter'}
          </Text>
        </Pressable>

        <View
          style={styles.gridWrapper}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <Grid
            grid={puzzle.grid}
            placedWords={puzzle.placedWords}
            selectedCell={selectedCell}
            highlightedCellKeys={highlightedCellKeys}
            onCellPress={handleCellPress}
            onCellLetter={handleCellLetter}
          />
        </View>

        <Pressable style={styles.clueColumns} onPress={handleDeselect}>
          <View style={styles.clueColumn}>
            <ClueSection
              title="Across"
              clues={acrossClues}
              showAnswers={showAnswers}
              activeWords={activeWords}
            />
          </View>
          <View style={styles.clueColumn}>
            <ClueSection
              title="Down"
              clues={downClues}
              showAnswers={showAnswers}
              activeWords={activeWords}
            />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ClueSection({
  title,
  clues,
  showAnswers,
  activeWords,
}: {
  title: string;
  clues: PlacedWord[];
  showAnswers: boolean;
  activeWords: PlacedWord[];
}) {
  if (clues.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.clueList}>
        {clues.map((entry) => {
          const isActive = isClueActive(entry, activeWords);
          return (
          <View
            key={`${entry.direction}-${entry.number}-${entry.word}`}
            style={[styles.clueRow, isActive && styles.clueRowActive]}
          >
            <Text style={[styles.clueNumber, isActive && styles.clueNumberActive]}>
              {entry.number}.
            </Text>
            <View style={styles.clueContent}>
              <Text style={[styles.clueText, isActive && styles.clueTextActive]}>
                {entry.clue}
              </Text>
              <Text style={styles.clueAnswer}>
                {showAnswers ? (
                  <Text style={styles.clueAnswerWord}>{entry.word}</Text>
                ) : (
                  `(${entry.word.length} letters)`
                )}
              </Text>
            </View>
          </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  tapToDeselect: {
    flexGrow: 1,
    gap: 12,
  },
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
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
    overflow: 'visible',
  },
  clueList: {
    gap: 8,
  },
  clueRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  clueRowActive: {
    backgroundColor: '#eef2ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3a6ef5',
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
  clueNumberActive: {
    color: '#3a6ef5',
  },
  clueTextActive: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  clueAnswer: {
    fontSize: 12,
    color: '#999',
  },
  clueAnswerWord: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3a6ef5',
    letterSpacing: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answerToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  answerToggleOn: {
    borderColor: '#3a6ef5',
    backgroundColor: '#eef2ff',
  },
  answerToggleText: {
    fontSize: 12,
    color: '#666',
  },
  answerToggleTextOn: {
    color: '#3a6ef5',
    fontWeight: '600',
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
