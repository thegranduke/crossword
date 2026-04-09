/**
 * Stub: returns a static list of words related to the topic.
 * Replace with LLM call later via llmService.
 */
export function generateWords(topic: string): string[] {
  const wordBank: Record<string, string[]> = {
    space: ['ORBIT', 'COMET', 'LUNAR', 'NEBULA', 'PLANET', 'GALAXY', 'ROCKET', 'SOLAR'],
    ocean: ['WAVE', 'CORAL', 'SHARK', 'TIDAL', 'DEPTH', 'KELP', 'TRENCH', 'FLEET'],
    music: ['CHORD', 'TEMPO', 'PITCH', 'RHYTHM', 'SCALE', 'BASS', 'TREBLE', 'CLEF'],
    animals: ['TIGER', 'EAGLE', 'WHALE', 'GECKO', 'BISON', 'OTTER', 'CRANE', 'VIPER'],
  };

  const key = topic.toLowerCase();
  const words = wordBank[key] ?? [
    'ALPHA',
    'BRAVO',
    'DELTA',
    'ECHO',
    'FOXTROT',
    'GOLF',
    'HOTEL',
    'INDIA',
  ];

  return words.slice(0, 6);
}
