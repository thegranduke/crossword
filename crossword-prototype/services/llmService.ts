/**
 * LLM Service — stub for prototype phase.
 *
 * In production, replace these stubs with real API calls:
 *   - OpenAI / Anthropic / Gemini for word and clue generation
 *   - Inject the returned values into generateWords / generateClues
 */

export async function fetchWordsFromLLM(topic: string): Promise<string[]> {
  // TODO: call LLM API with a prompt like:
  // "Give me 8 crossword-friendly words (uppercase, no spaces) related to: ${topic}"
  throw new Error('fetchWordsFromLLM not implemented — use generateWords stub for now');
}

export async function fetchCluesFromLLM(
  words: string[],
  topic: string
): Promise<Array<{ word: string; clue: string }>> {
  // TODO: call LLM API with a prompt like:
  // "Write a short crossword clue for each of these words in the context of ${topic}: ${words.join(', ')}"
  throw new Error('fetchCluesFromLLM not implemented — use generateClues stub for now');
}
