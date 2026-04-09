import type { WordEntry } from '@/modules/types/puzzle';

/**
 * Stub: pairs each word with a placeholder clue.
 * Replace with LLM-generated clues later via llmService.
 */
export function generateClues(words: string[]): WordEntry[] {
  return words.map((word) => ({
    word,
    clue: `Clue for ${word.charAt(0) + word.slice(1).toLowerCase()}`,
  }));
}
