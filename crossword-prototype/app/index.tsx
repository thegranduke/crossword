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

export default function HomeScreen() {
  const [topic, setTopic] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setPuzzle = usePuzzleStore((s) => s.setPuzzle);

  const minWords = getMinWordsForGridSize(gridSize);

  async function handleGenerate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    try {
      const puzzle = await generatePuzzle(topic.trim(), gridSize);
      setPuzzle(puzzle);
      router.push('/puzzle');
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
        <Text style={styles.subtitle}>Enter a topic and choose puzzle size</Text>

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

        <TouchableOpacity
          style={[styles.button, (!topic.trim() || loading) && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!topic.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Puzzle</Text>}
        </TouchableOpacity>

        {loading && <Text style={styles.loadingHint}>Generating with Gemini...</Text>}
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
});
