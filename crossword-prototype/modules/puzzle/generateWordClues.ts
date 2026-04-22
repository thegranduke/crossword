import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GridSize, WordEntry } from '@/modules/types/puzzle';
import { getMinWordsForGridSize } from './config';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const FALLBACK: Record<string, WordEntry[]> = {
  space: [
    { word: 'ORBIT', clue: 'Circular path around a celestial body' },
    { word: 'COMET', clue: 'Icy body with a glowing tail' },
    { word: 'LUNAR', clue: 'Relating to the Moon' },
    { word: 'NEBULA', clue: 'Interstellar cloud of gas and dust' },
    { word: 'PLANET', clue: 'Body orbiting a star' },
    { word: 'GALAXY', clue: 'Vast system of stars' },
    { word: 'ROCKET', clue: 'Vehicle propelled by thrust' },
    { word: 'SOLAR', clue: 'Relating to the Sun' },
    { word: 'ASTEROID', clue: 'Rocky object orbiting the Sun' },
    { word: 'COSMOS', clue: 'The universe as an ordered system' },
    { word: 'ECLIPSE', clue: 'When one body blocks another' },
    { word: 'CRATER', clue: 'Bowl-shaped surface depression' },
    { word: 'METEOR', clue: 'Streak of light from space debris' },
    { word: 'SATURN', clue: 'Ringed giant planet' },
    { word: 'ZENITH', clue: 'Highest point overhead' },
  ],
};

const GENERIC_FALLBACK: WordEntry[] = [
  { word: 'ALPHA', clue: 'First letter of the Greek alphabet' },
  { word: 'BRAVO', clue: 'NATO phonetic B' },
  { word: 'DELTA', clue: 'River mouth deposit' },
  { word: 'ECHO', clue: 'Reflected sound' },
  { word: 'FOXTROT', clue: 'Ballroom dance in 4/4 time' },
  { word: 'GOLF', clue: 'Sport with clubs and a small ball' },
  { word: 'HOTEL', clue: 'Temporary lodging place' },
  { word: 'INDIA', clue: 'South Asian nation' },
  { word: 'JULIET', clue: 'Shakespearean heroine' },
  { word: 'KILO', clue: 'Metric prefix meaning thousand' },
  { word: 'LIMA', clue: 'Capital city of Peru' },
  { word: 'MIKE', clue: 'Common short form of Michael' },
  { word: 'NOVA', clue: 'Suddenly brightened star' },
  { word: 'OSCAR', clue: 'Academy Award nickname' },
  { word: 'PIVOT', clue: 'Central turning point' },
  { word: 'QUARTZ', clue: 'Common crystalline mineral' },
  { word: 'RADIUS', clue: 'Center-to-edge distance' },
  { word: 'SUMMIT', clue: 'Top of a mountain' },
  { word: 'TANGO', clue: 'Argentine partner dance' },
  { word: 'VECTOR', clue: 'Quantity with magnitude and direction' },
];

function sanitizeEntries(entries: WordEntry[]): WordEntry[] {
  const seen = new Set<string>();

  return entries
    .map((entry) => ({
      word: entry.word.trim().toUpperCase(),
      clue: entry.clue.trim(),
    }))
    .filter((entry) => /^[A-Z]{3,12}$/.test(entry.word) && entry.clue.length > 0)
    .filter((entry) => {
      if (seen.has(entry.word)) return false;
      seen.add(entry.word);
      return true;
    });
}

function ensureMinimum(entries: WordEntry[], minWords: number): WordEntry[] {
  if (entries.length >= minWords) return entries;

  const filler = sanitizeEntries([...GENERIC_FALLBACK, ...FALLBACK.space]);
  const merged = [...entries];
  const existing = new Set(entries.map((entry) => entry.word));

  for (const candidate of filler) {
    if (existing.has(candidate.word)) continue;
    merged.push(candidate);
    existing.add(candidate.word);
    if (merged.length >= minWords) break;
  }

  return merged;
}

function fallbackWords(topic: string, minWords: number): WordEntry[] {
  const base = FALLBACK[topic.toLowerCase()] ?? GENERIC_FALLBACK;
  return ensureMinimum(sanitizeEntries(base), minWords);
}

function buildPrompt(topic: string, minWords: number, maxWords: number): string {
  return `Generate ${minWords} to ${maxWords} crossword word-and-clue pairs for the topic: "${topic}".

Rules:
- Each word must be UPPERCASE, 3 to 12 letters, no spaces, no hyphens, no numbers
- Each clue must be a concise crossword-style hint (do not repeat the word)
- Return ONLY a JSON array — no markdown, no explanation, no code fences

Example format:
[{"word":"FLAMINGO","clue":"Pink wading bird"},{"word":"SAVANNA","clue":"African grassland"}]`;
}

export async function generateWordClues(topic: string, gridSize: GridSize): Promise<WordEntry[]> {
  const minWords = getMinWordsForGridSize(gridSize);
  const maxWords = Math.min(minWords + 6, 28);
  const key = process.env.EXPO_PUBLIC_GEMINI_KEY;

  if (!key) {
    console.warn('[generateWordClues] No API key - using fallback words');
    return fallbackWords(topic, minWords);
  }

  try {
    const prompt = buildPrompt(topic, minWords, maxWords);
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array');
    }

    const mapped: WordEntry[] = parsed.map((entry) => ({
      word: typeof entry?.word === 'string' ? entry.word : '',
      clue: typeof entry?.clue === 'string' ? entry.clue : '',
    }));

    const valid = sanitizeEntries(mapped);
    if (valid.length === 0) {
      throw new Error('No valid entries');
    }

    return ensureMinimum(valid, minWords);
  } catch (error) {
    console.warn('[generateWordClues] Gemini failed - using fallback:', error);
    return fallbackWords(topic, minWords);
  }
}
