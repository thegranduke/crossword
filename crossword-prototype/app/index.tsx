'use client';

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { generatePuzzle } from '@/modules/puzzle';
import { usePuzzleStore } from '@/modules/state/usePuzzleStore';

export default function HomeScreen() {
  const [topic, setTopic] = useState('');
  const router = useRouter();
  const setPuzzle = usePuzzleStore((s) => s.setPuzzle);

  function handleGenerate() {
    if (!topic.trim()) return;
    const puzzle = generatePuzzle(topic.trim());
    setPuzzle(puzzle);
    router.push('/puzzle');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Crossword</Text>
        <Text style={styles.subtitle}>Enter a topic to generate a puzzle</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. space, ocean, music…"
          placeholderTextColor="#999"
          value={topic}
          onChangeText={setTopic}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleGenerate}
        />

        <TouchableOpacity
          style={[styles.button, !topic.trim() && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!topic.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Generate Puzzle</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 32,
    gap: 16,
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
    marginBottom: 8,
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
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
