import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { generatePuzzle } from '@/modules/puzzle';
import { usePuzzleStore } from '@/modules/state/usePuzzleStore';
import type { GridSize } from '@/modules/types/puzzle';
import { GRID_SIZE_OPTIONS, getMinWordsForGridSize } from '@/modules/puzzle/config';

type GenerationMode = 'topic' | 'create';

function countValidCustomWords(rawWords: string, gridSize: GridSize): number {
  const seen = new Set<string>();
  const tokens = rawWords
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  let valid = 0;
  for (const token of tokens) {
    const [rawWord] = token.split(':');
    const word = (rawWord ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3,12}$/.test(word)) continue;
    if (word.length > gridSize) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    valid += 1;
  }

  return valid;
}

export default function HomeScreen() {
  const [topic, setTopic] = useState('');
  const [rawWords, setRawWords] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>(10);
  const [mode, setMode] = useState<GenerationMode>('topic');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const setPuzzle = usePuzzleStore((s) => s.setPuzzle);

  const minWords = getMinWordsForGridSize(gridSize);
  const customWordCount = rawWords
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const validCustomWordCount = countValidCustomWords(rawWords, gridSize);

  const canGenerate =
    mode === 'topic'
      ? topic.trim().length > 0
      : validCustomWordCount >= 3;

  async function handleGenerate() {
    if (!canGenerate || loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const puzzle = await generatePuzzle(
        mode === 'create'
          ? { mode: 'create', rawWords }
          : { mode: 'topic', topic: topic.trim() },
        gridSize,
      );
      setPuzzle(puzzle);
      router.push('/puzzle');
    } catch (error) {
      console.warn('[HomeScreen] Failed to generate puzzle:', error);
      setErrorMessage('Could not generate puzzle. Check your words and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Crossword</Text>
        <Text style={styles.subtitle}>Choose mode, then generate your puzzle</Text>

        <View style={styles.modePicker}>
          <TouchableOpacity
            style={[styles.modePill, mode === 'topic' && styles.modePillActive]}
            onPress={() => setMode('topic')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={[styles.modePillText, mode === 'topic' && styles.modePillTextActive]}>
              Topic Mode
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, mode === 'create' && styles.modePillActive]}
            onPress={() => setMode('create')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={[styles.modePillText, mode === 'create' && styles.modePillTextActive]}>
              Create Mode
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sizePicker}>
          {GRID_SIZE_OPTIONS.map((option) => {
            const active = option === gridSize;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.sizePill, active && styles.sizePillActive]}
                onPress={() => setGridSize(option)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={[styles.sizePillText, active && styles.sizePillTextActive]}>
                  {option}x{option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.minWordsLabel}>Minimum clues targeted: {minWords}</Text>

        {mode === 'topic' ? (
          <TextInput
            style={styles.input}
            placeholder="e.g. space, ocean, music..."
            placeholderTextColor="#999"
            value={topic}
            onChangeText={setTopic}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleGenerate}
            editable={!loading}
          />
        ) : (
          <TextInput
            style={[styles.input, styles.wordsInput]}
            placeholder={`Enter words (max ${gridSize} letters) separated by commas/new lines.\nOptional clue format: WORD: your clue`}
            placeholderTextColor="#999"
            value={rawWords}
            onChangeText={setRawWords}
            autoCapitalize="characters"
            editable={!loading}
            multiline
            textAlignVertical="top"
          />
        )}

        <TouchableOpacity
          style={[styles.button, (!canGenerate || loading) && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Puzzle</Text>}
        </TouchableOpacity>

        {mode === 'create' && !loading && (
          <Text style={styles.loadingHint}>
            Valid words: {validCustomWordCount} / {customWordCount} entered
            {validCustomWordCount < minWords
              ? ` (recommended: ${minWords}+ for ${gridSize}x${gridSize})`
              : ''}
          </Text>
        )}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {loading && <Text style={styles.loadingHint}>Generating puzzle...</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  sizePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  modePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    backgroundColor: '#fff',
  },
  modePillActive: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  modePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  modePillTextActive: {
    color: '#fff',
  },
  sizePill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    backgroundColor: '#fff',
  },
  sizePillActive: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  sizePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  sizePillTextActive: {
    color: '#fff',
  },
  minWordsLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#777',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  wordsInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#c0392b',
  },
});
